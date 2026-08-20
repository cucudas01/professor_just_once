"""
순천대학교 개설강좌 크롤러
=================================
순천대학교 학사포털(SAINT)의 개설강좌 조회 페이지에서
최신 학기 강의 데이터를 수집하여 JSON 형식으로 저장합니다.

사용법:
    pip install -r requirements.txt
    python sunchon_crawler.py

주의사항:
    - 해당 스크립트는 포트폴리오 시연/연구 목적으로 제작되었습니다.
    - 실제 운영 시 순천대학교의 이용약관 및 robots.txt를 반드시 준수하세요.
    - 과도한 요청으로 서버에 부담을 주지 않도록 딜레이를 유지하세요.
"""

import json
import logging
import re
import time
from pathlib import Path
from typing import Optional

import requests
from bs4 import BeautifulSoup

# ── 로깅 설정 ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("crawler.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)

# ── 상수 설정 ──────────────────────────────────────────────────────────────────
BASE_URL = "https://www.sunchon.ac.kr"          # 실제 포털 주소로 교체 필요
COURSE_URL = f"{BASE_URL}/haksa/courses"        # 개설강좌 조회 엔드포인트 (예시)
REQUEST_DELAY = 1.5                             # 요청 간 딜레이 (초)
MAX_RETRIES = 3                                 # 최대 재시도 횟수
TIMEOUT = 15                                    # 요청 타임아웃 (초)

OUTPUT_PATH = Path(__file__).parent.parent.parent / "src" / "data" / "courses" / "sunchon.json"

# 교시 → 시작 시간 매핑 (순천대학교 교시 기준 — 실제 확인 후 조정 필요)
PERIOD_TO_HOUR: dict[int, int] = {
    1: 9, 2: 10, 3: 11, 4: 12,
    5: 13, 6: 14, 7: 15, 8: 16, 9: 17,
}

# 요일 한글 → 타입 매핑
DAY_MAP: dict[str, str] = {
    "월": "월", "화": "화", "수": "수", "목": "목", "금": "금",
}

ONLINE_KEYWORDS = ["사이버", "온라인", "비대면", "원격", "e-러닝", "이러닝"]


def make_session() -> requests.Session:
    """User-Agent 및 기본 헤더가 설정된 HTTP 세션을 반환합니다."""
    session = requests.Session()
    session.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "ko-KR,ko;q=0.9",
        "Referer": BASE_URL,
    })
    return session


def fetch_with_retry(session: requests.Session, url: str, params: Optional[dict] = None) -> Optional[BeautifulSoup]:
    """요청 실패 시 MAX_RETRIES 횟수만큼 재시도하여 BeautifulSoup 객체를 반환합니다."""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.info(f"요청 시도 {attempt}/{MAX_RETRIES}: {url}")
            resp = session.get(url, params=params, timeout=TIMEOUT)
            resp.raise_for_status()
            return BeautifulSoup(resp.text, "lxml")
        except requests.RequestException as e:
            logger.warning(f"요청 실패 (시도 {attempt}): {e}")
            if attempt < MAX_RETRIES:
                time.sleep(REQUEST_DELAY * attempt)
    logger.error(f"최대 재시도 초과: {url}")
    return None


def parse_schedule_string(schedule_str: str, room_str: str) -> list[dict]:
    """
    강의 시간 문자열을 ScheduleSlot 배열로 정규화합니다.

    예시 입력: "월1,2(공7-201)/수3(공7-201)"
    출력 형식:
    [
        {"day": "월", "startHour": 9, "duration": 2, "room": "공7-201"},
        {"day": "수", "startHour": 11, "duration": 1, "room": "공7-201"},
    ]
    """
    slots = []
    if not schedule_str or schedule_str.strip() in ("-", "", "미배정"):
        return slots

    # 슬래시 기준으로 분리: "월1,2(공7-201)" / "수3(공7-201)"
    segments = schedule_str.strip().split("/")
    for seg in segments:
        seg = seg.strip()
        # 강의실 추출: 괄호 안의 내용
        room_match = re.search(r"\(([^)]+)\)", seg)
        room = room_match.group(1).strip() if room_match else room_str.strip()

        # 괄호 제거 후 요일+교시 파싱
        seg_clean = re.sub(r"\([^)]*\)", "", seg).strip()
        day_match = re.match(r"([월화수목금])([\d,]+)", seg_clean)
        if not day_match:
            continue

        day_str = day_match.group(1)
        periods_str = day_match.group(2)
        day = DAY_MAP.get(day_str)
        if not day:
            continue

        periods = sorted(set(int(p) for p in periods_str.split(",") if p.isdigit()))
        if not periods:
            continue

        # 연속된 교시를 하나의 슬롯으로 합치기
        start_period = periods[0]
        duration = len(periods)
        start_hour = PERIOD_TO_HOUR.get(start_period, 9)

        slots.append({
            "day": day,
            "startHour": start_hour,
            "duration": duration,
            "room": room,
        })

    return slots


def detect_online(course_name: str, schedule_str: str) -> bool:
    """과목명 또는 시간 정보에서 비대면/사이버 과목 여부를 판별합니다."""
    combined = (course_name + schedule_str).lower()
    return any(kw in combined for kw in ONLINE_KEYWORDS)


def extract_first_slot(slots: list[dict]) -> tuple[str, int, int, str]:
    """슬롯 배열에서 기존 호환용 단일 day/startHour/duration/room을 추출합니다."""
    if slots:
        s = slots[0]
        return s["day"], s["startHour"], s["duration"], s["room"]
    return "월", 9, 2, ""


def crawl_sunchon_courses() -> list[dict]:
    """
    순천대학교 개설강좌 데이터를 크롤링하여 정규화된 JSON 목록으로 반환합니다.

    ⚠️  실제 운영 시:
        1. COURSE_URL을 포털의 실제 API/페이지 주소로 교체하세요.
        2. BeautifulSoup 셀렉터를 실제 HTML 구조에 맞게 조정하세요.
        3. 로그인이 필요한 경우 session.post()로 로그인 후 진행하세요.
    """
    session = make_session()
    courses = []
    color_index = 0

    # ── 실제 크롤링 대상 파라미터 (학기, 학과 코드 등) ─────────────────────────
    # 아래는 예시이며, 실제 포털 요청 파라미터로 교체해야 합니다.
    params = {
        "year": "2025",
        "semester": "2",   # 1: 1학기, 2: 2학기
    }

    soup = fetch_with_retry(session, COURSE_URL, params=params)
    if soup is None:
        logger.warning("⚠️  크롤링 실패 — 포트폴리오 데모용 샘플 데이터를 반환합니다.")
        return get_demo_courses()

    # ── HTML 파싱 (실제 테이블 구조에 맞게 셀렉터 수정 필요) ──────────────────
    rows = soup.select("table.course-list tbody tr")
    if not rows:
        logger.warning("강좌 목록 테이블을 찾을 수 없습니다. 데모 데이터를 반환합니다.")
        return get_demo_courses()

    for row in rows:
        cols = [td.get_text(strip=True) for td in row.select("td")]
        if len(cols) < 8:
            continue

        try:
            # 컬럼 매핑 (실제 포털 HTML 구조에 맞게 인덱스 조정 필요)
            department  = cols[0]
            course_code = cols[1]
            class_no    = cols[2]
            course_name = cols[3]
            category    = cols[4]
            credits_str = cols[5]
            professor   = cols[6]
            schedule_str= cols[7]
            room_str    = cols[8] if len(cols) > 8 else ""
            quota_str   = cols[9] if len(cols) > 9 else "0"

            credits = int(credits_str) if credits_str.isdigit() else 3
            quota   = int(quota_str)   if quota_str.isdigit()   else 0
            is_online = detect_online(course_name, schedule_str)
            slots = parse_schedule_string(schedule_str, room_str)
            day, start_hour, duration, room = extract_first_slot(slots)

            course = {
                "name":       course_name,
                "professor":  professor,
                "room":       room,
                "credits":    credits,
                "colorIndex": color_index % 6,
                "courseCode": course_code,
                "classNo":    class_no,
                "category":   category,
                "department": department,
                "quota":      quota,
                "isOnline":   is_online,
                # 기존 호환 필드
                "day":        day if day in ["월","화","수","목","금"] else "월",
                "startHour":  max(9, min(17, start_hour)),
                "duration":   max(1, min(5, duration)),
                # 복합 슬롯
                "slots":      slots if len(slots) > 0 else None,
            }
            # slots이 None이면 key 제거
            if not course["slots"]:
                del course["slots"]

            courses.append(course)
            color_index += 1
            time.sleep(0.05)  # 파싱 부하 완화

        except (IndexError, ValueError) as e:
            logger.debug(f"행 파싱 오류 (스킵): {e}")
            continue

    logger.info(f"총 {len(courses)}개 강좌 수집 완료")
    return courses


def get_demo_courses() -> list[dict]:
    """
    크롤링 실패 시 포트폴리오 시연용 데모 데이터를 반환합니다.
    실제 포털 연동 전까지 이 데이터가 사용됩니다.
    """
    return [
        {"name": "컴퓨터프로그래밍",  "professor": "박선진", "room": "IT융합관 201", "credits": 3, "courseCode": "CS1101", "classNo": "01", "category": "전필", "department": "컴퓨터공학과", "grade": 1, "quota": 40, "isOnline": False, "day": "월", "startHour": 9,  "duration": 2},
        {"name": "이산수학",          "professor": "임상오", "room": "공학관 312",   "credits": 3, "courseCode": "CS1201", "classNo": "01", "category": "전필", "department": "컴퓨터공학과", "grade": 1, "quota": 40, "isOnline": False, "day": "화", "startHour": 9,  "duration": 2},
        {"name": "자료구조및실습",    "professor": "조익성", "room": "IT융합관 403", "credits": 3, "courseCode": "CS2101", "classNo": "01", "category": "전필", "department": "컴퓨터공학과", "grade": 2, "quota": 35, "isOnline": False, "day": "월", "startHour": 13, "duration": 2},
        {"name": "컴퓨터구조",        "professor": "최영민", "room": "IT융합관 202", "credits": 3, "courseCode": "CS2201", "classNo": "01", "category": "전선", "department": "컴퓨터공학과", "grade": 2, "quota": 35, "isOnline": False, "day": "수", "startHour": 10, "duration": 2},
        {"name": "알고리즘설계",      "professor": "정민수", "room": "공학관 415",   "credits": 3, "courseCode": "CS3101", "classNo": "01", "category": "전선", "department": "컴퓨터공학과", "grade": 3, "quota": 30, "isOnline": False, "day": "화", "startHour": 10, "duration": 2},
        {"name": "데이터베이스시스템","professor": "신선혜", "room": "IT융합관 301", "credits": 3, "courseCode": "CS3201", "classNo": "01", "category": "전선", "department": "컴퓨터공학과", "grade": 3, "quota": 30, "isOnline": False, "day": "목", "startHour": 13, "duration": 2},
        {"name": "소프트웨어공학",    "professor": "정동일", "room": "공학관 315",   "credits": 3, "courseCode": "CS3301", "classNo": "01", "category": "전선", "department": "컴퓨터공학과", "grade": 3, "quota": 30, "isOnline": False, "day": "수", "startHour": 14, "duration": 2},
        {"name": "인공지능응용",      "professor": "박현철", "room": "IT융합관 405", "credits": 3, "courseCode": "CS4101", "classNo": "01", "category": "전선", "department": "컴퓨터공학과", "grade": 4, "quota": 25, "isOnline": False, "day": "금", "startHour": 10, "duration": 2},
        {"name": "컴퓨터네트워크",    "professor": "윤성민", "room": "공학관 403",   "credits": 3, "courseCode": "CS3401", "classNo": "01", "category": "전선", "department": "컴퓨터공학과", "grade": 3, "quota": 30, "isOnline": False, "day": "목", "startHour": 10, "duration": 2},
        {"name": "운영체제실습",      "professor": "최강혁", "room": "IT융합관 308", "credits": 3, "courseCode": "CS3501", "classNo": "01", "category": "전선", "department": "컴퓨터공학과", "grade": 3, "quota": 30, "isOnline": False, "day": "금", "startHour": 13, "duration": 2},
        {"name": "남도역사와문화",    "professor": "김현수", "room": "인문사회관 102","credits": 2, "courseCode": "GE1101", "classNo": "01", "category": "균교", "department": "교양학부",     "grade": 1, "quota": 60, "isOnline": False, "day": "화", "startHour": 14, "duration": 2},
        {"name": "창의적문제해결",    "professor": "이은하", "room": "",             "credits": 2, "courseCode": "GE1201", "classNo": "01", "category": "균교", "department": "교양학부",     "grade": 1, "quota": 50, "isOnline": True,  "day": "월", "startHour": 9,  "duration": 1},
        {"name": "기초파이썬",        "professor": "한승우", "room": "IT융합관 101", "credits": 2, "courseCode": "GE2101", "classNo": "01", "category": "균교", "department": "교양학부",     "grade": 1, "quota": 45, "isOnline": False, "day": "수", "startHour": 16, "duration": 1},
        {"name": "글로벌실용영어",    "professor": "Sarah Connor", "room": "언어교육원 201", "credits": 2, "courseCode": "GE1301", "classNo": "01", "category": "교필", "department": "교양학부", "grade": 1, "quota": 30, "isOnline": False, "day": "목", "startHour": 15, "duration": 2},
        {"name": "대학글쓰기",        "professor": "조윤서", "room": "인문사회관 304","credits": 2, "courseCode": "GE1401", "classNo": "01", "category": "교필", "department": "교양학부",     "grade": 1, "quota": 30, "isOnline": False, "day": "금", "startHour": 9,  "duration": 2},
    ]


def save_courses(courses: list[dict]) -> None:
    """수집된 강좌 데이터를 JSON 파일로 저장합니다."""
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(courses, f, ensure_ascii=False, indent=2)
    logger.info(f"✅ {len(courses)}개 강좌 데이터를 저장했습니다: {OUTPUT_PATH}")


if __name__ == "__main__":
    logger.info("🕷️  순천대학교 개설강좌 크롤러 시작")
    courses = crawl_sunchon_courses()
    save_courses(courses)
    logger.info("🎉 크롤러 완료")
