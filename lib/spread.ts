import type { SpreadInfo } from "./tarot";

export function detectSpread(question: string): SpreadInfo {
  const q = question;

  // 1장: 짧은 질문 또는 yes/no
  if (
    q.length < 15 ||
    /오늘.{0,8}(어때|어떨|뭐야|뭔가요)/.test(q) ||
    /^.{0,25}(할까요?|말까요?|될까요?|해야\s*할까)\??$/.test(q)
  ) {
    return {
      type: "one",
      count: 1,
      positions: ["오늘의 메시지"],
      description: "핵심 메시지 한 장으로 확인하세요.",
    };
  }

  // 연애/관계 → 3장 (5장 체크보다 먼저)
  if (/사랑|연애|남자친구|여자친구|남친|여친|짝사랑|고백|헤어|이별|결혼|썸|좋아하|사귀|연인|좋은 감정|마음이/.test(q)) {
    return {
      type: "three",
      count: 3,
      positions: ["나의 마음", "상대의 마음", "두 사람의 앞날"],
      description: "두 사람의 마음과 앞날을 살펴보세요.",
    };
  }

  // 5장: 복잡한 진로/갈등 (30자 이상 긴 질문)
  if (
    q.length > 30 &&
    (
      /진로|이직|커리어|경력|창업|사업/.test(q) ||
      /갈등|복잡|얽혀|힘들어|힘든|고민이 많|모르겠어/.test(q)
    )
  ) {
    return {
      type: "five",
      count: 5,
      positions: ["현재 상황", "장애물", "내면의 목소리", "가능한 결과", "핵심 조언"],
      description: "5가지 관점으로 깊게 살펴보세요.",
    };
  }

  // 진로/공부 → 3장 (단독 "일" 제외, 구체적 단어만)
  if (/직장|회사|직업|취업|알바|아르바이트|공부|시험|학교|대학교|과제|프로젝트|업무/.test(q)) {
    return {
      type: "three",
      count: 3,
      positions: ["현재 에너지", "나아갈 방향", "결과"],
      description: "현재 흐름과 방향을 살펴보세요.",
    };
  }

  // 기본 3장
  return {
    type: "three",
    count: 3,
    positions: ["과거의 영향", "현재 에너지", "미래의 가능성"],
    description: "흐름을 3장으로 살펴보세요.",
  };
}
