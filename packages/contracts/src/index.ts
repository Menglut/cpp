export type Role = "USER" | "ADMIN";
export type Language = "C11" | "CPP17";
export type Comparator = "TOKEN" | "EXACT";

export type UserSummary = {
  id: string;
  email: string;
  nickname: string;
  role: Role;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
};

export type CreateRunRequest = {
  problemVersionId: string;
  language: Language;
  sourceCode: string;
  stdin: string;
};

export type CreateSubmissionRequest = Omit<CreateRunRequest, "stdin">;

export type ExecutionStatus =
  | "PENDING"
  | "QUEUED"
  | "COMPILING"
  | "RUNNING"
  | "SUCCESS"
  | "AC"
  | "WA"
  | "CE"
  | "RE"
  | "TLE"
  | "MLE"
  | "OLE"
  | "SYSTEM_ERROR"
  | "CANCELLED";
