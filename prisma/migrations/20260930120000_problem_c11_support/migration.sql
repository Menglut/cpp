ALTER TABLE "problem_versions"
ADD COLUMN "starter_code_c11" TEXT NOT NULL DEFAULT E'#include <stdio.h>\n\nint main(void) {\n    // 여기에 코드를 작성하세요.\n    return 0;\n}\n';
