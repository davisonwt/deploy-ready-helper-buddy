export const SECURITY_QUESTIONS: { key: string; label: string }[] = [
  { key: "first_pet", label: "What was the name of your first pet?" },
  { key: "primary_school", label: "What was the name of your primary school?" },
  { key: "mothers_maiden", label: "What is your mother's maiden name?" },
  { key: "childhood_street", label: "What was the name of the street you grew up on?" },
  { key: "first_car", label: "What was the make of your first car?" },
  { key: "childhood_best_friend", label: "What is the name of your childhood best friend?" },
  { key: "birth_city", label: "What city were you born in?" },
];

export const getQuestionLabel = (key: string) =>
  SECURITY_QUESTIONS.find((q) => q.key === key)?.label ?? key;
