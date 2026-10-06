export interface paths {
    "/api/v1/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 서버 상태 확인 */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description 성공 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            status: "ok";
                            /** @enum {string} */
                            service: "field-note";
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/session": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 현재 세션 확인 */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description 성공 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** Format: uuid */
                            userId: string;
                            /** Format: uuid */
                            companyId: string;
                        };
                    };
                };
                /** @description 로그인 필요 */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/samples": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 샘플 생성 (틀 검증용) */
        post: {
            parameters: {
                query?: never;
                header: {
                    "Idempotency-Key": string;
                };
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        title: string;
                    };
                };
            };
            responses: {
                /** @description 성공 */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** Format: uuid */
                            id: string;
                            title: string;
                        };
                    };
                };
                /** @description 입력 오류 */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description 로그인 필요 */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description 요청 과다 */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/invitations/{token}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 초대 링크 확인 (가입 화면 진입) */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    token: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description 성공 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            companyName: string;
                            adminName: string;
                            /** Format: date-time */
                            expiresAt: string;
                            documents: {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "TERMS_OF_SERVICE" | "PRIVACY_POLICY" | "MARKETING";
                                version: string;
                                title: string;
                                isRequired: boolean;
                                path: string;
                            }[];
                        };
                    };
                };
                /** @description 입력 오류 */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description 요청 과다 */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/signup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 초대 링크로 가입 (약관 동의·만 14세 확인) */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        inviteToken: string;
                        loginId: string;
                        password: string;
                        /** Format: email */
                        email: string;
                        /** @enum {boolean} */
                        isAgeConfirmed: true;
                        consents: {
                            /** Format: uuid */
                            documentId: string;
                            isAgreed: boolean;
                        }[];
                    };
                };
            };
            responses: {
                /** @description 성공 */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** Format: email */
                            email: string;
                            resendAfterSeconds: number;
                        };
                    };
                };
                /** @description 입력 오류 */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description LOGIN_ID_TAKEN */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description 요청 과다 */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/email/verify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 이메일 인증 코드 확인 (가입 완료) */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        code: string;
                    };
                };
            };
            responses: {
                /** @description 성공 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            displayName: string;
                            /** Format: email */
                            email: string | null;
                            isEmailVerified: boolean;
                            companyName: string;
                        };
                    };
                };
                /** @description EMAIL_CODE_INVALID */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description 로그인 필요 */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description 요청 과다 */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/email/resend": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 이메일 인증 코드 재발송 */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description 성공 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            resendAfterSeconds: number;
                        };
                    };
                };
                /** @description 로그인 필요 */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description 요청 과다 */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 아이디 로그인 */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        loginId: string;
                        password: string;
                        /** @default true */
                        isRemembered?: boolean;
                    };
                };
            };
            responses: {
                /** @description 성공 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            displayName: string;
                            /** Format: email */
                            email: string | null;
                            isEmailVerified: boolean;
                            companyName: string;
                        };
                    };
                };
                /** @description 입력 오류 */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description INVALID_CREDENTIALS */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description ACCOUNT_LOCKED */
                423: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description 요청 과다 */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 로그인한 관리자 정보 */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description 성공 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            displayName: string;
                            /** Format: email */
                            email: string | null;
                            isEmailVerified: boolean;
                            companyName: string;
                        };
                    };
                };
                /** @description 로그인 필요 */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/company/settings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 회사 설정 조회 (기준시간·월 기준일수·공수 방식) */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description 성공 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            standardWorkMinutes: number;
                            monthlyWorkDays: number;
                            /** @enum {string} */
                            workUnitMode: "RATIO" | "HOURS";
                        };
                    };
                };
                /** @description 로그인 필요 */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
            };
        };
        /** 회사 설정 변경 */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        standardWorkMinutes: number;
                        monthlyWorkDays: number;
                        /** @enum {string} */
                        workUnitMode: "RATIO" | "HOURS";
                    };
                };
            };
            responses: {
                /** @description 성공 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            standardWorkMinutes: number;
                            monthlyWorkDays: number;
                            /** @enum {string} */
                            workUnitMode: "RATIO" | "HOURS";
                        };
                    };
                };
                /** @description 입력 오류 */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description 로그인 필요 */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/devices": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 로그인 기기 목록 */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description 성공 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            devices: {
                                id: string;
                                label: string;
                                /** Format: date-time */
                                lastActiveAt: string;
                                isCurrent: boolean;
                            }[];
                        };
                    };
                };
                /** @description 로그인 필요 */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/devices/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** 기기 원격 로그아웃 */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description 성공 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {boolean} */
                            success: true;
                        };
                    };
                };
                /** @description 입력 오류 */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description 로그인 필요 */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 로그아웃 */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description 성공 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {boolean} */
                            success: true;
                        };
                    };
                };
                /** @description 로그인 필요 */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: never;
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
