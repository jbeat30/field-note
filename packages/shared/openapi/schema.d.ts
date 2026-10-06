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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/auth/password-reset/request": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 비밀번호 재설정 메일 요청 (가입 여부와 관계없이 같은 응답) */
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
                        /** Format: email */
                        email: string;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/auth/password-reset/{token}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 비밀번호 재설정 링크 확인 */
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/auth/password-reset/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 새 비밀번호 설정 (모든 기기 로그아웃) */
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
                        token: string;
                        newPassword: string;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/me/password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 비밀번호 변경 (다른 기기 로그아웃) */
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
                        currentPassword: string;
                        newPassword: string;
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
                            /** @enum {boolean} */
                            success: true;
                        };
                    };
                };
                /** @description CURRENT_PASSWORD_INVALID */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/me/email/change": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 이메일 변경 요청 (새 주소로 인증 코드 발송, 인증해야 반영) */
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
                        /** Format: email */
                        newEmail: string;
                        currentPassword: string;
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
                            resendAfterSeconds: number;
                        };
                    };
                };
                /** @description CURRENT_PASSWORD_INVALID */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/me/closure": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 계정 해지 요청 (즉시 로그인 차단, 14일 유예 뒤 삭제) */
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
                        currentPassword?: string;
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
                            /** Format: date-time */
                            purgeAfter: string;
                        };
                    };
                };
                /** @description CURRENT_PASSWORD_INVALID */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/auth/closure/{token}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 해지 취소 링크 확인 (삭제 예정 시각) */
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
                            /** Format: date-time */
                            purgeAfter: string;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/auth/closure/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 해지 취소 (계정 복구) */
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
                        token: string;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/auth/social/providers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 사용 가능한 소셜 로그인 제공자 */
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
                            kakao: boolean;
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
    "/api/v1/auth/kakao/start": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 카카오 로그인·가입 시작 (카카오 화면 주소 반환) */
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
                        /** @enum {string} */
                        purpose: "login";
                    } | {
                        /** @enum {string} */
                        purpose: "signup";
                        inviteToken: string;
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
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            url: string;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description NOT_IMPLEMENTED */
                501: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/me/social/kakao/start": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 로그인한 계정에 카카오 연동 시작 */
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
                            url: string;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description NOT_IMPLEMENTED */
                501: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/auth/kakao/callback": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 카카오에서 돌아오는 주소 (연동·로그인·가입을 마치고 웹 화면으로 이동) */
        get: {
            parameters: {
                query?: {
                    code?: string;
                    state?: string;
                    error?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description 다른 주소로 이동 (Location 헤더) */
                302: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/me/social": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 연동된 로그인 수단 */
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
                            hasPassword: boolean;
                            kakao: {
                                isLinked: boolean;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/me/social/kakao": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** 카카오 연동 해제 (로그인 수단이 하나 이상 남아야 함) */
        delete: {
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description LAST_LOGIN_METHOD */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
