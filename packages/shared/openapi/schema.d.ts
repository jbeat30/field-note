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
    "/api/v1/company/options": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 선택 목록 전체 조회 (직종·작업 구분·공종·직원 구분, 처음에는 프리셋으로 채움) */
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
                            items: {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                kind: "JOB_TYPE" | "WORK_CATEGORY" | "TRADE" | "WORKER_TYPE";
                                name: string;
                                isActive: boolean;
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
        /** 선택 목록 항목 추가 */
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
                        kind: "JOB_TYPE" | "WORK_CATEGORY" | "TRADE" | "WORKER_TYPE";
                        name: string;
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
                            /** @enum {string} */
                            kind: "JOB_TYPE" | "WORK_CATEGORY" | "TRADE" | "WORKER_TYPE";
                            name: string;
                            isActive: boolean;
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
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/company/options/order": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** 선택 목록 순서 변경 (해당 종류의 모든 항목을 원하는 순서로) */
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
                        /** @enum {string} */
                        kind: "JOB_TYPE" | "WORK_CATEGORY" | "TRADE" | "WORKER_TYPE";
                        ids: string[];
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
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/company/options/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** 선택 목록 항목 이름 변경·숨기기 */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        name?: string;
                        isActive?: boolean;
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
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "JOB_TYPE" | "WORK_CATEGORY" | "TRADE" | "WORKER_TYPE";
                            name: string;
                            isActive: boolean;
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
        trace?: never;
    };
    "/api/v1/employees": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 직원 목록 (생년월일·연락처 제외, 상태·직종·구분·이름 필터) */
        get: {
            parameters: {
                query?: {
                    status?: "ACTIVE" | "ON_LEAVE" | "LEFT";
                    jobTypeId?: string;
                    workerTypeId?: string;
                    q?: string;
                };
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
                            items: {
                                /** Format: uuid */
                                id: string;
                                name: string;
                                title: string | null;
                                /** Format: uuid */
                                jobTypeId: string | null;
                                /** Format: uuid */
                                workerTypeId: string | null;
                                /** @enum {string} */
                                status: "ACTIVE" | "ON_LEAVE" | "LEFT";
                                /** Format: date */
                                hiredOn: string | null;
                                /** Format: date */
                                leftOn: string | null;
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
        /** 직원 등록 (이름만으로도 가능) */
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
                        name: string;
                        /** Format: uuid */
                        jobTypeId?: string | null;
                        /** Format: uuid */
                        workerTypeId?: string | null;
                        title?: string | null;
                        /** @enum {string} */
                        status?: "ACTIVE" | "ON_LEAVE";
                        /** Format: date */
                        hiredOn?: string | null;
                        /** Format: date */
                        birthDate?: string | null;
                        phone?: string | null;
                        memo?: string | null;
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
                            name: string;
                            title: string | null;
                            /** Format: uuid */
                            jobTypeId: string | null;
                            /** Format: uuid */
                            workerTypeId: string | null;
                            /** @enum {string} */
                            status: "ACTIVE" | "ON_LEAVE" | "LEFT";
                            /** Format: date */
                            hiredOn: string | null;
                            /** Format: date */
                            leftOn: string | null;
                            /** Format: date */
                            birthDate: string | null;
                            phone: string | null;
                            memo: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
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
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/employees/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 직원 카드 (생년월일·연락처 포함) */
        get: {
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
                            /** Format: uuid */
                            id: string;
                            name: string;
                            title: string | null;
                            /** Format: uuid */
                            jobTypeId: string | null;
                            /** Format: uuid */
                            workerTypeId: string | null;
                            /** @enum {string} */
                            status: "ACTIVE" | "ON_LEAVE" | "LEFT";
                            /** Format: date */
                            hiredOn: string | null;
                            /** Format: date */
                            leftOn: string | null;
                            /** Format: date */
                            birthDate: string | null;
                            phone: string | null;
                            memo: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
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
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** 직원 정보 수정·상태 변경 (퇴사·재입사 포함) */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        name?: string;
                        /** Format: uuid */
                        jobTypeId?: string | null;
                        /** Format: uuid */
                        workerTypeId?: string | null;
                        title?: string | null;
                        /** @enum {string} */
                        status?: "ACTIVE" | "ON_LEAVE" | "LEFT";
                        /** Format: date */
                        hiredOn?: string | null;
                        /** Format: date */
                        leftOn?: string | null;
                        /** Format: date */
                        birthDate?: string | null;
                        phone?: string | null;
                        memo?: string | null;
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
                            /** Format: uuid */
                            id: string;
                            name: string;
                            title: string | null;
                            /** Format: uuid */
                            jobTypeId: string | null;
                            /** Format: uuid */
                            workerTypeId: string | null;
                            /** @enum {string} */
                            status: "ACTIVE" | "ON_LEAVE" | "LEFT";
                            /** Format: date */
                            hiredOn: string | null;
                            /** Format: date */
                            leftOn: string | null;
                            /** Format: date */
                            birthDate: string | null;
                            phone: string | null;
                            memo: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
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
        trace?: never;
    };
    "/api/v1/partners": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 고객·협력업체·자재 공급처 목록 (연락처·메모 제외, 구분·이름 검색) */
        get: {
            parameters: {
                query?: {
                    kind?: "CLIENT" | "SUBCONTRACTOR" | "SUPPLIER";
                    q?: string;
                };
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
                            items: {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                kind: "CLIENT" | "SUBCONTRACTOR" | "SUPPLIER";
                                name: string;
                                contactName: string | null;
                                isActive: boolean;
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
        /** 명부 등록 (구분과 상호만으로 가능) */
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
                        kind: "CLIENT" | "SUBCONTRACTOR" | "SUPPLIER";
                        name: string;
                        contactName?: string | null;
                        phone?: string | null;
                        memo?: string | null;
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
                            /** @enum {string} */
                            kind: "CLIENT" | "SUBCONTRACTOR" | "SUPPLIER";
                            name: string;
                            contactName: string | null;
                            isActive: boolean;
                            phone: string | null;
                            memo: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
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
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/partners/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 명부 카드 (연락처·메모 포함) */
        get: {
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
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "CLIENT" | "SUBCONTRACTOR" | "SUPPLIER";
                            name: string;
                            contactName: string | null;
                            isActive: boolean;
                            phone: string | null;
                            memo: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
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
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** 명부 수정·숨기기 (구분은 바꿀 수 없음) */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        name?: string;
                        contactName?: string | null;
                        phone?: string | null;
                        memo?: string | null;
                        isActive?: boolean;
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
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "CLIENT" | "SUBCONTRACTOR" | "SUPPLIER";
                            name: string;
                            contactName: string | null;
                            isActive: boolean;
                            phone: string | null;
                            memo: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
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
        trace?: never;
    };
    "/api/v1/projects": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 프로젝트 목록 (상태·고객·담당자·공종·기간·검색 필터와 정렬) */
        get: {
            parameters: {
                query?: {
                    status?: "PLANNED" | "IN_PROGRESS" | "SUSPENDED" | "COMPLETED" | "WARRANTY" | "CLOSED" | "CANCELLED";
                    clientId?: string;
                    managerId?: string;
                    tradeId?: string;
                    from?: string;
                    to?: string;
                    q?: string;
                    sort?: "recent" | "endDate" | "name";
                };
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
                            items: {
                                /** Format: uuid */
                                id: string;
                                code: string;
                                name: string;
                                /** @enum {string} */
                                status: "PLANNED" | "IN_PROGRESS" | "SUSPENDED" | "COMPLETED" | "WARRANTY" | "CLOSED" | "CANCELLED";
                                siteName: string;
                                /** Format: uuid */
                                clientId: string;
                                /** Format: uuid */
                                managerId: string;
                                tradeIds: string[];
                                /** Format: date */
                                plannedStart: string;
                                /** Format: date */
                                plannedEnd: string;
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
        /** 프로젝트 등록 (코드 자동 번호, 상태는 예정) */
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
                        name: string;
                        siteName: string;
                        siteAddress?: string | null;
                        siteMapUrl?: string | null;
                        siteContactName?: string | null;
                        siteContactPhone?: string | null;
                        accessMemo?: string | null;
                        /** Format: uuid */
                        clientId: string;
                        /** Format: uuid */
                        managerId: string;
                        tradeIds?: string[];
                        /** Format: date */
                        contractDate: string;
                        /** Format: date */
                        plannedStart: string;
                        /** Format: date */
                        plannedEnd: string;
                        memo?: string | null;
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
                            code: string;
                            name: string;
                            /** @enum {string} */
                            status: "PLANNED" | "IN_PROGRESS" | "SUSPENDED" | "COMPLETED" | "WARRANTY" | "CLOSED" | "CANCELLED";
                            siteName: string;
                            /** Format: uuid */
                            clientId: string;
                            /** Format: uuid */
                            managerId: string;
                            tradeIds: string[];
                            /** Format: date */
                            plannedStart: string;
                            /** Format: date */
                            plannedEnd: string;
                            /** Format: date */
                            actualStart: string | null;
                            /** Format: date */
                            actualEnd: string | null;
                            siteAddress: string | null;
                            siteMapUrl: string | null;
                            siteContactName: string | null;
                            siteContactPhone: string | null;
                            accessMemo: string | null;
                            /** Format: date */
                            contractDate: string;
                            memo: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
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
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 프로젝트 기본정보 */
        get: {
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
                            /** Format: uuid */
                            id: string;
                            code: string;
                            name: string;
                            /** @enum {string} */
                            status: "PLANNED" | "IN_PROGRESS" | "SUSPENDED" | "COMPLETED" | "WARRANTY" | "CLOSED" | "CANCELLED";
                            siteName: string;
                            /** Format: uuid */
                            clientId: string;
                            /** Format: uuid */
                            managerId: string;
                            tradeIds: string[];
                            /** Format: date */
                            plannedStart: string;
                            /** Format: date */
                            plannedEnd: string;
                            /** Format: date */
                            actualStart: string | null;
                            /** Format: date */
                            actualEnd: string | null;
                            siteAddress: string | null;
                            siteMapUrl: string | null;
                            siteContactName: string | null;
                            siteContactPhone: string | null;
                            accessMemo: string | null;
                            /** Format: date */
                            contractDate: string;
                            memo: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
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
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** 프로젝트 기본정보 수정 (코드·상태는 바꿀 수 없음) */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        name?: string;
                        siteName?: string;
                        siteAddress?: string | null;
                        siteMapUrl?: string | null;
                        siteContactName?: string | null;
                        siteContactPhone?: string | null;
                        accessMemo?: string | null;
                        /** Format: uuid */
                        clientId?: string;
                        /** Format: uuid */
                        managerId?: string;
                        tradeIds?: string[];
                        /** Format: date */
                        contractDate?: string;
                        /** Format: date */
                        plannedStart?: string;
                        /** Format: date */
                        plannedEnd?: string;
                        memo?: string | null;
                        periodChangeReason?: string | null;
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
                            /** Format: uuid */
                            id: string;
                            code: string;
                            name: string;
                            /** @enum {string} */
                            status: "PLANNED" | "IN_PROGRESS" | "SUSPENDED" | "COMPLETED" | "WARRANTY" | "CLOSED" | "CANCELLED";
                            siteName: string;
                            /** Format: uuid */
                            clientId: string;
                            /** Format: uuid */
                            managerId: string;
                            tradeIds: string[];
                            /** Format: date */
                            plannedStart: string;
                            /** Format: date */
                            plannedEnd: string;
                            /** Format: date */
                            actualStart: string | null;
                            /** Format: date */
                            actualEnd: string | null;
                            siteAddress: string | null;
                            siteMapUrl: string | null;
                            siteContactName: string | null;
                            siteContactPhone: string | null;
                            accessMemo: string | null;
                            /** Format: date */
                            contractDate: string;
                            memo: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
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
        trace?: never;
    };
    "/api/v1/projects/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 프로젝트 상태 전환 (예정 → 진행 → 중단·완료, 취소). 날짜·사유와 함께 이력에 남음 */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @enum {string} */
                        toStatus: "PLANNED" | "IN_PROGRESS" | "SUSPENDED" | "COMPLETED" | "WARRANTY" | "CLOSED" | "CANCELLED";
                        /** Format: date */
                        effectiveOn?: string;
                        reason?: string | null;
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
                            /** Format: uuid */
                            id: string;
                            code: string;
                            name: string;
                            /** @enum {string} */
                            status: "PLANNED" | "IN_PROGRESS" | "SUSPENDED" | "COMPLETED" | "WARRANTY" | "CLOSED" | "CANCELLED";
                            siteName: string;
                            /** Format: uuid */
                            clientId: string;
                            /** Format: uuid */
                            managerId: string;
                            tradeIds: string[];
                            /** Format: date */
                            plannedStart: string;
                            /** Format: date */
                            plannedEnd: string;
                            /** Format: date */
                            actualStart: string | null;
                            /** Format: date */
                            actualEnd: string | null;
                            siteAddress: string | null;
                            siteMapUrl: string | null;
                            siteContactName: string | null;
                            siteContactPhone: string | null;
                            accessMemo: string | null;
                            /** Format: date */
                            contractDate: string;
                            memo: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
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
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}/status-history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 프로젝트 상태 변경 이력 (최근이 맨 앞) */
        get: {
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
                            items: {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                fromStatus: "PLANNED" | "IN_PROGRESS" | "SUSPENDED" | "COMPLETED" | "WARRANTY" | "CLOSED" | "CANCELLED";
                                /** @enum {string} */
                                toStatus: "PLANNED" | "IN_PROGRESS" | "SUSPENDED" | "COMPLETED" | "WARRANTY" | "CLOSED" | "CANCELLED";
                                /** Format: date */
                                effectiveOn: string;
                                reason: string | null;
                                /** Format: date-time */
                                changedAt: string;
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
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}/period-history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 프로젝트 예정 기간 변경 이력 (연장·단축한 날짜와 사유, 최근이 맨 앞) */
        get: {
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
                            items: {
                                /** Format: uuid */
                                id: string;
                                /** Format: date */
                                fromStart: string;
                                /** Format: date */
                                fromEnd: string;
                                /** Format: date */
                                toStart: string;
                                /** Format: date */
                                toEnd: string;
                                reason: string | null;
                                /** Format: date-time */
                                changedAt: string;
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
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}/assignments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 프로젝트 투입 목록 (같은 날 다른 프로젝트 겹침·휴직·퇴사 경고 포함) */
        get: {
            parameters: {
                query?: {
                    includeCancelled?: "true";
                };
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
                            items: {
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                projectId: string;
                                /** Format: uuid */
                                employeeId: string;
                                /** Format: date */
                                startDate: string;
                                /** Format: date */
                                endDate: string;
                                plannedMinutes: number | null;
                                /** Format: date-time */
                                cancelledAt: string | null;
                                warnings: ({
                                    /** @enum {string} */
                                    type: "OVERLAP";
                                    /** Format: uuid */
                                    projectId: string;
                                    projectCode: string;
                                    projectName: string;
                                    /** Format: date */
                                    from: string;
                                    /** Format: date */
                                    to: string;
                                } | {
                                    /** @enum {string} */
                                    type: "ON_LEAVE";
                                } | {
                                    /** @enum {string} */
                                    type: "LEFT";
                                })[];
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
        put?: never;
        /** 투입 등록 (프로젝트 기간 안, 퇴사 직원 불가, 중단 중에는 관리자 확인 필요) */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: uuid */
                        employeeId: string;
                        /** Format: date */
                        startDate: string;
                        /** Format: date */
                        endDate: string;
                        plannedMinutes?: number | null;
                        confirmSuspended?: boolean;
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
                            /** Format: uuid */
                            projectId: string;
                            /** Format: uuid */
                            employeeId: string;
                            /** Format: date */
                            startDate: string;
                            /** Format: date */
                            endDate: string;
                            plannedMinutes: number | null;
                            /** Format: date-time */
                            cancelledAt: string | null;
                            warnings: ({
                                /** @enum {string} */
                                type: "OVERLAP";
                                /** Format: uuid */
                                projectId: string;
                                projectCode: string;
                                projectName: string;
                                /** Format: date */
                                from: string;
                                /** Format: date */
                                to: string;
                            } | {
                                /** @enum {string} */
                                type: "ON_LEAVE";
                            } | {
                                /** @enum {string} */
                                type: "LEFT";
                            })[];
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
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}/assignments/{assignmentId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** 투입 기간·계획 공수 수정 */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    assignmentId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: date */
                        startDate?: string;
                        /** Format: date */
                        endDate?: string;
                        plannedMinutes?: number | null;
                        confirmSuspended?: boolean;
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
                            /** Format: uuid */
                            id: string;
                            /** Format: uuid */
                            projectId: string;
                            /** Format: uuid */
                            employeeId: string;
                            /** Format: date */
                            startDate: string;
                            /** Format: date */
                            endDate: string;
                            plannedMinutes: number | null;
                            /** Format: date-time */
                            cancelledAt: string | null;
                            warnings: ({
                                /** @enum {string} */
                                type: "OVERLAP";
                                /** Format: uuid */
                                projectId: string;
                                projectCode: string;
                                projectName: string;
                                /** Format: date */
                                from: string;
                                /** Format: date */
                                to: string;
                            } | {
                                /** @enum {string} */
                                type: "ON_LEAVE";
                            } | {
                                /** @enum {string} */
                                type: "LEFT";
                            })[];
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
        trace?: never;
    };
    "/api/v1/projects/{id}/assignments/{assignmentId}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 투입 취소 (지우지 않고 취소 표시만 남김) */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    assignmentId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        confirmSuspended?: boolean;
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
                            /** Format: uuid */
                            id: string;
                            /** Format: uuid */
                            projectId: string;
                            /** Format: uuid */
                            employeeId: string;
                            /** Format: date */
                            startDate: string;
                            /** Format: date */
                            endDate: string;
                            plannedMinutes: number | null;
                            /** Format: date-time */
                            cancelledAt: string | null;
                            warnings: ({
                                /** @enum {string} */
                                type: "OVERLAP";
                                /** Format: uuid */
                                projectId: string;
                                projectCode: string;
                                projectName: string;
                                /** Format: date */
                                from: string;
                                /** Format: date */
                                to: string;
                            } | {
                                /** @enum {string} */
                                type: "ON_LEAVE";
                            } | {
                                /** @enum {string} */
                                type: "LEFT";
                            })[];
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
