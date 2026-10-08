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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/projects/{id}/work-logs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 프로젝트 작업일지 목록 (날짜·상태 필터, 공수 합과 임시 저장 표시) */
        get: {
            parameters: {
                query?: {
                    from?: string;
                    to?: string;
                    status?: "DRAFT" | "SAVED";
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
                                /** Format: date */
                                workDate: string;
                                /** @enum {string} */
                                status: "DRAFT" | "SAVED";
                                isChange: boolean;
                                isAfterService: boolean;
                                isLate: boolean;
                                entryCount: number;
                                totalMinutes: number;
                                hasContent: boolean;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/projects/{id}/work-summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 프로젝트 공수 집계 (직원별·작업 구분별·기간별, 저장된 일지만 반영) */
        get: {
            parameters: {
                query?: {
                    from?: string;
                    to?: string;
                    unit?: "week" | "month";
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
                            totalMinutes: number;
                            plannedMinutes: number | null;
                            workedDays: number;
                            savedLogCount: number;
                            draftLogCount: number;
                            byEmployee: {
                                /** Format: uuid */
                                employeeId: string;
                                workedDays: number;
                                totalMinutes: number;
                                plannedMinutes: number | null;
                            }[];
                            byCategory: {
                                /** Format: uuid */
                                categoryId: string;
                                totalMinutes: number;
                            }[];
                            byPeriod: {
                                /** Format: date */
                                periodStart: string;
                                totalMinutes: number;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/employees/{id}/work-history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 직원의 프로젝트별 투입 이력과 이번 달·올해 공수 (저장된 일지만 반영) */
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
                            thisMonthMinutes: number;
                            thisYearMinutes: number;
                            totalMinutes: number;
                            projects: {
                                /** Format: uuid */
                                projectId: string;
                                projectCode: string;
                                projectName: string;
                                /** Format: date */
                                assignedFrom: string | null;
                                /** Format: date */
                                assignedTo: string | null;
                                workedDays: number;
                                totalMinutes: number;
                                /** Format: date */
                                lastWorkDate: string | null;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/projects/{id}/work-logs/{workDate}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 그날의 작업일지 (공수 항목과 경고 포함) */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    workDate: string;
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
                            /** Format: uuid */
                            projectId: string;
                            /** Format: date */
                            workDate: string;
                            /** @enum {string} */
                            status: "DRAFT" | "SAVED";
                            content: string;
                            area: string | null;
                            notes: string | null;
                            isChange: boolean;
                            isAfterService: boolean;
                            version: number;
                            /** Format: date-time */
                            savedAt: string | null;
                            isLate: boolean;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                            entries: {
                                /** Format: uuid */
                                employeeId: string;
                                /** Format: uuid */
                                categoryId: string;
                                minutes: number;
                            }[];
                            warnings: ({
                                /** @enum {string} */
                                type: "DAILY_OVER";
                                /** Format: uuid */
                                employeeId: string;
                                totalMinutes: number;
                                otherProjects: {
                                    /** Format: uuid */
                                    projectId: string;
                                    projectCode: string;
                                    projectName: string;
                                    minutes: number;
                                }[];
                            } | {
                                /** @enum {string} */
                                type: "ON_LEAVE";
                                /** Format: uuid */
                                employeeId: string;
                            } | {
                                /** @enum {string} */
                                type: "LEFT";
                                /** Format: uuid */
                                employeeId: string;
                            })[];
                            autoAssignedEmployeeIds: string[];
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
        /** 그날의 작업일지 임시 저장·저장 (없으면 만들고 있으면 고침, 낙관적 잠금) */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    workDate: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "DRAFT" | "SAVED";
                        content: string;
                        area?: string | null;
                        notes?: string | null;
                        /** @default false */
                        isChange?: boolean;
                        /** @default false */
                        isAfterService?: boolean;
                        entries: {
                            /** Format: uuid */
                            employeeId: string;
                            /** Format: uuid */
                            categoryId: string;
                            minutes: number;
                        }[];
                        expectedVersion?: number | null;
                        confirmStatus?: boolean;
                        addMissingAssignments?: boolean;
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
                            /** Format: date */
                            workDate: string;
                            /** @enum {string} */
                            status: "DRAFT" | "SAVED";
                            content: string;
                            area: string | null;
                            notes: string | null;
                            isChange: boolean;
                            isAfterService: boolean;
                            version: number;
                            /** Format: date-time */
                            savedAt: string | null;
                            isLate: boolean;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                            entries: {
                                /** Format: uuid */
                                employeeId: string;
                                /** Format: uuid */
                                categoryId: string;
                                minutes: number;
                            }[];
                            warnings: ({
                                /** @enum {string} */
                                type: "DAILY_OVER";
                                /** Format: uuid */
                                employeeId: string;
                                totalMinutes: number;
                                otherProjects: {
                                    /** Format: uuid */
                                    projectId: string;
                                    projectCode: string;
                                    projectName: string;
                                    minutes: number;
                                }[];
                            } | {
                                /** @enum {string} */
                                type: "ON_LEAVE";
                                /** Format: uuid */
                                employeeId: string;
                            } | {
                                /** @enum {string} */
                                type: "LEFT";
                                /** Format: uuid */
                                employeeId: string;
                            })[];
                            autoAssignedEmployeeIds: string[];
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description CONFLICT */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/projects/{id}/work-logs/{workDate}/revisions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 작업일지 수정 이력 (고치기 전 값, 최근이 맨 앞) */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    workDate: string;
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
                                version: number;
                                snapshot: {
                                    /** @enum {string} */
                                    status: "DRAFT" | "SAVED";
                                    content: string;
                                    area: string | null;
                                    notes: string | null;
                                    isChange: boolean;
                                    isAfterService: boolean;
                                    entries: {
                                        /** Format: uuid */
                                        employeeId: string;
                                        /** Format: uuid */
                                        categoryId: string;
                                        minutes: number;
                                    }[];
                                };
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/projects/{projectId}/files": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 파일 업로드 신청 (형식·크기·회사 용량 확인 후 짧은 만료의 업로드 주소 발급) */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    projectId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        name: string;
                        /** @enum {string} */
                        purpose: "PHOTO" | "DOCUMENT";
                        contentType: string;
                        size: number;
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
                            file: {
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                projectId: string;
                                /** @enum {string} */
                                purpose: "PHOTO" | "DOCUMENT";
                                name: string;
                                contentType: string;
                                size: number;
                                /** @enum {string} */
                                status: "PENDING" | "PROCESSING" | "READY" | "REJECTED";
                                /** @enum {string|null} */
                                rejectReason: "CONTENT_MISMATCH" | "SIZE_MISMATCH" | "NOT_UPLOADED" | "UNREADABLE_IMAGE" | null;
                                hasThumbnail: boolean;
                                sha256: string | null;
                                /** Format: uuid */
                                uploadedBy: string;
                                /** Format: date-time */
                                createdAt: string;
                                /** Format: date-time */
                                readyAt: string | null;
                            };
                            upload: {
                                /** Format: uri */
                                url: string;
                                /** @enum {string} */
                                method: "PUT";
                                headers: {
                                    [key: string]: string;
                                };
                                /** Format: date-time */
                                expiresAt: string;
                            };
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
                                message: string;
                                details?: {
                                    path: string;
                                    message: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description STORAGE_QUOTA_EXCEEDED */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: {
                                /** @enum {string} */
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/files/{id}/complete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 업로드 완료 알림 (내용 검사·썸네일 작업 시작, 여러 번 보내도 안전) */
        post: {
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
                            /** Format: uuid */
                            projectId: string;
                            /** @enum {string} */
                            purpose: "PHOTO" | "DOCUMENT";
                            name: string;
                            contentType: string;
                            size: number;
                            /** @enum {string} */
                            status: "PENDING" | "PROCESSING" | "READY" | "REJECTED";
                            /** @enum {string|null} */
                            rejectReason: "CONTENT_MISMATCH" | "SIZE_MISMATCH" | "NOT_UPLOADED" | "UNREADABLE_IMAGE" | null;
                            hasThumbnail: boolean;
                            sha256: string | null;
                            /** Format: uuid */
                            uploadedBy: string;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            readyAt: string | null;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/files/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 파일 정보와 검사 상태 (거부되면 사유 포함) */
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
                            /** Format: uuid */
                            projectId: string;
                            /** @enum {string} */
                            purpose: "PHOTO" | "DOCUMENT";
                            name: string;
                            contentType: string;
                            size: number;
                            /** @enum {string} */
                            status: "PENDING" | "PROCESSING" | "READY" | "REJECTED";
                            /** @enum {string|null} */
                            rejectReason: "CONTENT_MISMATCH" | "SIZE_MISMATCH" | "NOT_UPLOADED" | "UNREADABLE_IMAGE" | null;
                            hasThumbnail: boolean;
                            sha256: string | null;
                            /** Format: uuid */
                            uploadedBy: string;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            readyAt: string | null;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/files/{id}/url": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 내려받기·미리보기 주소 발급 (검사가 끝난 파일만, 짧은 만료) */
        get: {
            parameters: {
                query?: {
                    variant?: "original" | "thumbnail";
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
                            /** Format: uri */
                            url: string;
                            /** Format: date-time */
                            expiresAt: string;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/projects/{projectId}/photos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 사진첩 (촬영일시 최근순, 구분·구역·작업일 필터, 커서 방식) */
        get: {
            parameters: {
                query?: {
                    category?: "BEFORE" | "DURING" | "AFTER" | "DEFECT" | "MATERIAL" | "SAFETY" | "OTHER";
                    area?: string;
                    workDate?: string;
                    cursor?: string;
                    limit?: number;
                };
                header?: never;
                path: {
                    projectId: string;
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
                                fileId: string;
                                /** @enum {string} */
                                category: "BEFORE" | "DURING" | "AFTER" | "DEFECT" | "MATERIAL" | "SAFETY" | "OTHER";
                                area: string | null;
                                /** Format: date-time */
                                takenAt: string;
                                /** Format: date */
                                workDate: string;
                                description: string | null;
                                isCover: boolean;
                                /** Format: uuid */
                                uploadedBy: string;
                                /** Format: date-time */
                                createdAt: string;
                                file: {
                                    /** @enum {string} */
                                    status: "PENDING" | "PROCESSING" | "READY" | "REJECTED";
                                    /** @enum {string|null} */
                                    rejectReason: "CONTENT_MISMATCH" | "SIZE_MISMATCH" | "NOT_UPLOADED" | "UNREADABLE_IMAGE" | null;
                                    size: number;
                                };
                                /** Format: uri */
                                thumbnailUrl: string | null;
                            }[];
                            nextCursor: string | null;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
        /** 올린 파일을 사진으로 등록 (같은 파일을 다시 등록하면 기존 사진을 돌려줌) */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    projectId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: uuid */
                        fileId: string;
                        /**
                         * @default OTHER
                         * @enum {string}
                         */
                        category?: "BEFORE" | "DURING" | "AFTER" | "DEFECT" | "MATERIAL" | "SAFETY" | "OTHER";
                        area?: string;
                        /** Format: date-time */
                        takenAt?: string;
                        /** Format: date */
                        workDate?: string;
                        description?: string;
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
                            fileId: string;
                            /** @enum {string} */
                            category: "BEFORE" | "DURING" | "AFTER" | "DEFECT" | "MATERIAL" | "SAFETY" | "OTHER";
                            area: string | null;
                            /** Format: date-time */
                            takenAt: string;
                            /** Format: date */
                            workDate: string;
                            description: string | null;
                            isCover: boolean;
                            /** Format: uuid */
                            uploadedBy: string;
                            /** Format: date-time */
                            createdAt: string;
                            file: {
                                /** @enum {string} */
                                status: "PENDING" | "PROCESSING" | "READY" | "REJECTED";
                                /** @enum {string|null} */
                                rejectReason: "CONTENT_MISMATCH" | "SIZE_MISMATCH" | "NOT_UPLOADED" | "UNREADABLE_IMAGE" | null;
                                size: number;
                            };
                            /** Format: uri */
                            thumbnailUrl: string | null;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/photos/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 사진 한 장 */
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
                            /** Format: uuid */
                            projectId: string;
                            /** Format: uuid */
                            fileId: string;
                            /** @enum {string} */
                            category: "BEFORE" | "DURING" | "AFTER" | "DEFECT" | "MATERIAL" | "SAFETY" | "OTHER";
                            area: string | null;
                            /** Format: date-time */
                            takenAt: string;
                            /** Format: date */
                            workDate: string;
                            description: string | null;
                            isCover: boolean;
                            /** Format: uuid */
                            uploadedBy: string;
                            /** Format: date-time */
                            createdAt: string;
                            file: {
                                /** @enum {string} */
                                status: "PENDING" | "PROCESSING" | "READY" | "REJECTED";
                                /** @enum {string|null} */
                                rejectReason: "CONTENT_MISMATCH" | "SIZE_MISMATCH" | "NOT_UPLOADED" | "UNREADABLE_IMAGE" | null;
                                size: number;
                            };
                            /** Format: uri */
                            thumbnailUrl: string | null;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
        /** 사진 삭제 (소프트 삭제: 파일과 기록은 보존) */
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
        /** 사진 정보 수정·대표 사진 지정 (대표는 프로젝트마다 한 장) */
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
                        /** @enum {string} */
                        category?: "BEFORE" | "DURING" | "AFTER" | "DEFECT" | "MATERIAL" | "SAFETY" | "OTHER";
                        area?: string | null;
                        /** Format: date-time */
                        takenAt?: string;
                        /** Format: date */
                        workDate?: string;
                        description?: string | null;
                        isCover?: boolean;
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
                            fileId: string;
                            /** @enum {string} */
                            category: "BEFORE" | "DURING" | "AFTER" | "DEFECT" | "MATERIAL" | "SAFETY" | "OTHER";
                            area: string | null;
                            /** Format: date-time */
                            takenAt: string;
                            /** Format: date */
                            workDate: string;
                            description: string | null;
                            isCover: boolean;
                            /** Format: uuid */
                            uploadedBy: string;
                            /** Format: date-time */
                            createdAt: string;
                            file: {
                                /** @enum {string} */
                                status: "PENDING" | "PROCESSING" | "READY" | "REJECTED";
                                /** @enum {string|null} */
                                rejectReason: "CONTENT_MISMATCH" | "SIZE_MISMATCH" | "NOT_UPLOADED" | "UNREADABLE_IMAGE" | null;
                                size: number;
                            };
                            /** Format: uri */
                            thumbnailUrl: string | null;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/memos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 메모함(scope=INBOX) 또는 프로젝트 메모 노트(scope=PROJECT) 목록 (날짜 최근순, 태그·완료 필터, 커서 방식) */
        get: {
            parameters: {
                query: {
                    scope: "INBOX" | "PROJECT";
                    projectId?: string;
                    tag?: "NEGOTIATION" | "INSTRUCTION" | "ISSUE" | "TODO" | "OTHER";
                    isDone?: "true" | "false";
                    cursor?: string;
                    limit?: number;
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
                                /** Format: uuid */
                                projectId: string | null;
                                content: string;
                                /** @enum {string} */
                                tag: "NEGOTIATION" | "INSTRUCTION" | "ISSUE" | "TODO" | "OTHER";
                                /** Format: date */
                                memoDate: string;
                                isDone: boolean;
                                /** Format: date-time */
                                doneAt: string | null;
                                /** Format: uuid */
                                createdBy: string;
                                /** Format: date-time */
                                createdAt: string;
                                /** Format: date-time */
                                updatedAt: string;
                            }[];
                            nextCursor: string | null;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
        /** 메모 저장 (프로젝트를 정하지 않으면 메모함, 한 줄만 적어도 저장) */
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
                        content: string;
                        /**
                         * @default OTHER
                         * @enum {string}
                         */
                        tag?: "NEGOTIATION" | "INSTRUCTION" | "ISSUE" | "TODO" | "OTHER";
                        /** Format: date */
                        memoDate?: string;
                        /** Format: uuid */
                        projectId?: string;
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
                            projectId: string | null;
                            content: string;
                            /** @enum {string} */
                            tag: "NEGOTIATION" | "INSTRUCTION" | "ISSUE" | "TODO" | "OTHER";
                            /** Format: date */
                            memoDate: string;
                            isDone: boolean;
                            /** Format: date-time */
                            doneAt: string | null;
                            /** Format: uuid */
                            createdBy: string;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/memos/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 정리 안 된 메모함 건수와 끝내지 않은 할 일 건수 */
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
                            inboxCount: number;
                            openTodoCount: number;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/memos/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 메모 한 건 */
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
                            /** Format: uuid */
                            projectId: string | null;
                            content: string;
                            /** @enum {string} */
                            tag: "NEGOTIATION" | "INSTRUCTION" | "ISSUE" | "TODO" | "OTHER";
                            /** Format: date */
                            memoDate: string;
                            isDone: boolean;
                            /** Format: date-time */
                            doneAt: string | null;
                            /** Format: uuid */
                            createdBy: string;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
        /** 메모 삭제 (소프트 삭제) */
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
        /** 메모 수정·프로젝트 연결(메모함 정리)·할 일 완료 표시 */
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
                        content?: string;
                        /** @enum {string} */
                        tag?: "NEGOTIATION" | "INSTRUCTION" | "ISSUE" | "TODO" | "OTHER";
                        /** Format: date */
                        memoDate?: string;
                        /** Format: uuid */
                        projectId?: string | null;
                        isDone?: boolean;
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
                            projectId: string | null;
                            content: string;
                            /** @enum {string} */
                            tag: "NEGOTIATION" | "INSTRUCTION" | "ISSUE" | "TODO" | "OTHER";
                            /** Format: date */
                            memoDate: string;
                            isDone: boolean;
                            /** Format: date-time */
                            doneAt: string | null;
                            /** Format: uuid */
                            createdBy: string;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/materials": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 자재 목록 (최근 기록한 자재가 먼저, 이름·규격 검색, 숨긴 자재는 기본 제외) */
        get: {
            parameters: {
                query?: {
                    q?: string;
                    category?: "RAW" | "SUB" | "FINISH" | "CONSUMABLE";
                    includeInactive?: "true" | "false";
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
                                spec: string | null;
                                unit: string;
                                /** @enum {string} */
                                category: "RAW" | "SUB" | "FINISH" | "CONSUMABLE";
                                isActive: boolean;
                                /** Format: date */
                                lastUsedOn: string | null;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
        /** 자재 추가 (이름과 단위만으로 가능, 입력하다 목록에 없을 때 바로 추가) */
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
                        spec?: string;
                        unit: string;
                        /**
                         * @default CONSUMABLE
                         * @enum {string}
                         */
                        category?: "RAW" | "SUB" | "FINISH" | "CONSUMABLE";
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
                            spec: string | null;
                            unit: string;
                            /** @enum {string} */
                            category: "RAW" | "SUB" | "FINISH" | "CONSUMABLE";
                            isActive: boolean;
                            /** Format: date */
                            lastUsedOn: string | null;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/materials/{id}": {
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
        /** 자재 수정·숨기기 (기록이 있으면 단위는 바꿀 수 없음) */
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
                        spec?: string | null;
                        unit?: string;
                        /** @enum {string} */
                        category?: "RAW" | "SUB" | "FINISH" | "CONSUMABLE";
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
                            name: string;
                            spec: string | null;
                            unit: string;
                            /** @enum {string} */
                            category: "RAW" | "SUB" | "FINISH" | "CONSUMABLE";
                            isActive: boolean;
                            /** Format: date */
                            lastUsedOn: string | null;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/projects/{projectId}/material-records": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 프로젝트 자재 기록 (날짜 최근순, 날짜·자재·구분 필터, 커서 방식) */
        get: {
            parameters: {
                query?: {
                    date?: string;
                    materialId?: string;
                    kind?: "RECEIVED" | "USED" | "RETURNED" | "DISCARDED";
                    cursor?: string;
                    limit?: number;
                };
                header?: never;
                path: {
                    projectId: string;
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
                                materialId: string;
                                /** Format: date */
                                recordDate: string;
                                /** @enum {string} */
                                kind: "RECEIVED" | "USED" | "RETURNED" | "DISCARDED";
                                quantity: number;
                                /** Format: uuid */
                                categoryId: string | null;
                                area: string | null;
                                /** Format: uuid */
                                partnerId: string | null;
                                sourceText: string | null;
                                isChange: boolean;
                                isAfterService: boolean;
                                memo: string | null;
                                /** Format: uuid */
                                createdBy: string;
                                /** Format: date-time */
                                createdAt: string;
                                /** Format: date-time */
                                updatedAt: string;
                            }[];
                            nextCursor: string | null;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
        /** 자재 기록 한 건 (반입·사용·반출·폐기) */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    projectId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: uuid */
                        materialId: string;
                        /** Format: date */
                        recordDate: string;
                        /** @enum {string} */
                        kind: "RECEIVED" | "USED" | "RETURNED" | "DISCARDED";
                        quantity: number;
                        /** Format: uuid */
                        categoryId?: string;
                        area?: string;
                        /** Format: uuid */
                        partnerId?: string;
                        sourceText?: string;
                        /** @default false */
                        isChange?: boolean;
                        /** @default false */
                        isAfterService?: boolean;
                        memo?: string;
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
                            materialId: string;
                            /** Format: date */
                            recordDate: string;
                            /** @enum {string} */
                            kind: "RECEIVED" | "USED" | "RETURNED" | "DISCARDED";
                            quantity: number;
                            /** Format: uuid */
                            categoryId: string | null;
                            area: string | null;
                            /** Format: uuid */
                            partnerId: string | null;
                            sourceText: string | null;
                            isChange: boolean;
                            isAfterService: boolean;
                            memo: string | null;
                            /** Format: uuid */
                            createdBy: string;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/projects/{projectId}/material-records/batch": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 자재 기록 여러 건 한꺼번에 (목록형 입력, 한 건이라도 잘못되면 전부 저장하지 않음) */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    projectId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        records: {
                            /** Format: uuid */
                            materialId: string;
                            /** Format: date */
                            recordDate: string;
                            /** @enum {string} */
                            kind: "RECEIVED" | "USED" | "RETURNED" | "DISCARDED";
                            quantity: number;
                            /** Format: uuid */
                            categoryId?: string;
                            area?: string;
                            /** Format: uuid */
                            partnerId?: string;
                            sourceText?: string;
                            /** @default false */
                            isChange?: boolean;
                            /** @default false */
                            isAfterService?: boolean;
                            memo?: string;
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
                            items: {
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                projectId: string;
                                /** Format: uuid */
                                materialId: string;
                                /** Format: date */
                                recordDate: string;
                                /** @enum {string} */
                                kind: "RECEIVED" | "USED" | "RETURNED" | "DISCARDED";
                                quantity: number;
                                /** Format: uuid */
                                categoryId: string | null;
                                area: string | null;
                                /** Format: uuid */
                                partnerId: string | null;
                                sourceText: string | null;
                                isChange: boolean;
                                isAfterService: boolean;
                                memo: string | null;
                                /** Format: uuid */
                                createdBy: string;
                                /** Format: date-time */
                                createdAt: string;
                                /** Format: date-time */
                                updatedAt: string;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/projects/{projectId}/material-balance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 프로젝트별 자재 현황 (자재마다 반입·사용·반출·폐기 합계와 잔량, 마이너스 경고) */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    projectId: string;
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
                                materialId: string;
                                name: string;
                                spec: string | null;
                                unit: string;
                                received: number;
                                used: number;
                                returned: number;
                                discarded: number;
                                remaining: number;
                                isNegative: boolean;
                                usedForChange: number;
                                usedForAfterService: number;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/material-records/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** 자재 기록 삭제 (소프트 삭제) */
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
        /** 자재 기록 수정 */
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
                        /** Format: date */
                        recordDate?: string;
                        /** @enum {string} */
                        kind?: "RECEIVED" | "USED" | "RETURNED" | "DISCARDED";
                        quantity?: number;
                        /** Format: uuid */
                        categoryId?: string | null;
                        area?: string | null;
                        /** Format: uuid */
                        partnerId?: string | null;
                        sourceText?: string | null;
                        isChange?: boolean;
                        isAfterService?: boolean;
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
                            /** Format: uuid */
                            projectId: string;
                            /** Format: uuid */
                            materialId: string;
                            /** Format: date */
                            recordDate: string;
                            /** @enum {string} */
                            kind: "RECEIVED" | "USED" | "RETURNED" | "DISCARDED";
                            quantity: number;
                            /** Format: uuid */
                            categoryId: string | null;
                            area: string | null;
                            /** Format: uuid */
                            partnerId: string | null;
                            sourceText: string | null;
                            isChange: boolean;
                            isAfterService: boolean;
                            memo: string | null;
                            /** Format: uuid */
                            createdBy: string;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/projects/{projectId}/documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 프로젝트 문서함 (고정한 문서가 먼저, 분류·이름·고정 필터, 문서마다 최신본) */
        get: {
            parameters: {
                query?: {
                    category?: "DRAWING" | "SPEC" | "WORK_ORDER" | "CONTRACT" | "SAFETY" | "OTHER";
                    q?: string;
                    pinned?: "true" | "false";
                };
                header?: never;
                path: {
                    projectId: string;
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
                                /** @enum {string} */
                                category: "DRAWING" | "SPEC" | "WORK_ORDER" | "CONTRACT" | "SAFETY" | "OTHER";
                                title: string;
                                isSensitive: boolean;
                                isPinned: boolean;
                                /** Format: uuid */
                                createdBy: string;
                                /** Format: date-time */
                                createdAt: string;
                                /** Format: date-time */
                                updatedAt: string;
                                versionCount: number;
                                latest: {
                                    versionNo: number;
                                    /** Format: uuid */
                                    fileId: string;
                                    fileName: string;
                                    contentType: string;
                                    size: number;
                                    /** @enum {string} */
                                    fileStatus: "PENDING" | "PROCESSING" | "READY" | "REJECTED";
                                    /** @enum {string|null} */
                                    rejectReason: "CONTENT_MISMATCH" | "SIZE_MISMATCH" | "NOT_UPLOADED" | "UNREADABLE_IMAGE" | null;
                                    /** Format: date */
                                    revisionDate: string;
                                    reason: string | null;
                                    /** Format: uuid */
                                    uploadedBy: string;
                                    /** Format: date-time */
                                    createdAt: string;
                                };
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
        /** 올린 파일로 문서 만들기 (첫 버전, 계약·행정은 기본 민감 자료, 같은 파일로 다시 부르면 같은 문서) */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    projectId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: uuid */
                        fileId: string;
                        title: string;
                        /**
                         * @default OTHER
                         * @enum {string}
                         */
                        category?: "DRAWING" | "SPEC" | "WORK_ORDER" | "CONTRACT" | "SAFETY" | "OTHER";
                        isSensitive?: boolean;
                        /** Format: date */
                        revisionDate?: string;
                        reason?: string;
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
                            /** @enum {string} */
                            category: "DRAWING" | "SPEC" | "WORK_ORDER" | "CONTRACT" | "SAFETY" | "OTHER";
                            title: string;
                            isSensitive: boolean;
                            isPinned: boolean;
                            /** Format: uuid */
                            createdBy: string;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                            versionCount: number;
                            latest: {
                                versionNo: number;
                                /** Format: uuid */
                                fileId: string;
                                fileName: string;
                                contentType: string;
                                size: number;
                                /** @enum {string} */
                                fileStatus: "PENDING" | "PROCESSING" | "READY" | "REJECTED";
                                /** @enum {string|null} */
                                rejectReason: "CONTENT_MISMATCH" | "SIZE_MISMATCH" | "NOT_UPLOADED" | "UNREADABLE_IMAGE" | null;
                                /** Format: date */
                                revisionDate: string;
                                reason: string | null;
                                /** Format: uuid */
                                uploadedBy: string;
                                /** Format: date-time */
                                createdAt: string;
                            };
                            versions: {
                                versionNo: number;
                                /** Format: uuid */
                                fileId: string;
                                fileName: string;
                                contentType: string;
                                size: number;
                                /** @enum {string} */
                                fileStatus: "PENDING" | "PROCESSING" | "READY" | "REJECTED";
                                /** @enum {string|null} */
                                rejectReason: "CONTENT_MISMATCH" | "SIZE_MISMATCH" | "NOT_UPLOADED" | "UNREADABLE_IMAGE" | null;
                                /** Format: date */
                                revisionDate: string;
                                reason: string | null;
                                /** Format: uuid */
                                uploadedBy: string;
                                /** Format: date-time */
                                createdAt: string;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/documents/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 문서 한 건 (최신본과 이전 버전 전체) */
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
                            /** Format: uuid */
                            projectId: string;
                            /** @enum {string} */
                            category: "DRAWING" | "SPEC" | "WORK_ORDER" | "CONTRACT" | "SAFETY" | "OTHER";
                            title: string;
                            isSensitive: boolean;
                            isPinned: boolean;
                            /** Format: uuid */
                            createdBy: string;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                            versionCount: number;
                            latest: {
                                versionNo: number;
                                /** Format: uuid */
                                fileId: string;
                                fileName: string;
                                contentType: string;
                                size: number;
                                /** @enum {string} */
                                fileStatus: "PENDING" | "PROCESSING" | "READY" | "REJECTED";
                                /** @enum {string|null} */
                                rejectReason: "CONTENT_MISMATCH" | "SIZE_MISMATCH" | "NOT_UPLOADED" | "UNREADABLE_IMAGE" | null;
                                /** Format: date */
                                revisionDate: string;
                                reason: string | null;
                                /** Format: uuid */
                                uploadedBy: string;
                                /** Format: date-time */
                                createdAt: string;
                            };
                            versions: {
                                versionNo: number;
                                /** Format: uuid */
                                fileId: string;
                                fileName: string;
                                contentType: string;
                                size: number;
                                /** @enum {string} */
                                fileStatus: "PENDING" | "PROCESSING" | "READY" | "REJECTED";
                                /** @enum {string|null} */
                                rejectReason: "CONTENT_MISMATCH" | "SIZE_MISMATCH" | "NOT_UPLOADED" | "UNREADABLE_IMAGE" | null;
                                /** Format: date */
                                revisionDate: string;
                                reason: string | null;
                                /** Format: uuid */
                                uploadedBy: string;
                                /** Format: date-time */
                                createdAt: string;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
        /** 문서 삭제 (소프트 삭제: 파일·버전·열람 기록은 보존) */
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
        /** 문서 이름·분류·민감 표시·프로젝트 첫 화면 고정 수정 */
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
                        title?: string;
                        /** @enum {string} */
                        category?: "DRAWING" | "SPEC" | "WORK_ORDER" | "CONTRACT" | "SAFETY" | "OTHER";
                        isSensitive?: boolean;
                        isPinned?: boolean;
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
                            /** @enum {string} */
                            category: "DRAWING" | "SPEC" | "WORK_ORDER" | "CONTRACT" | "SAFETY" | "OTHER";
                            title: string;
                            isSensitive: boolean;
                            isPinned: boolean;
                            /** Format: uuid */
                            createdBy: string;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                            versionCount: number;
                            latest: {
                                versionNo: number;
                                /** Format: uuid */
                                fileId: string;
                                fileName: string;
                                contentType: string;
                                size: number;
                                /** @enum {string} */
                                fileStatus: "PENDING" | "PROCESSING" | "READY" | "REJECTED";
                                /** @enum {string|null} */
                                rejectReason: "CONTENT_MISMATCH" | "SIZE_MISMATCH" | "NOT_UPLOADED" | "UNREADABLE_IMAGE" | null;
                                /** Format: date */
                                revisionDate: string;
                                reason: string | null;
                                /** Format: uuid */
                                uploadedBy: string;
                                /** Format: date-time */
                                createdAt: string;
                            };
                            versions: {
                                versionNo: number;
                                /** Format: uuid */
                                fileId: string;
                                fileName: string;
                                contentType: string;
                                size: number;
                                /** @enum {string} */
                                fileStatus: "PENDING" | "PROCESSING" | "READY" | "REJECTED";
                                /** @enum {string|null} */
                                rejectReason: "CONTENT_MISMATCH" | "SIZE_MISMATCH" | "NOT_UPLOADED" | "UNREADABLE_IMAGE" | null;
                                /** Format: date */
                                revisionDate: string;
                                reason: string | null;
                                /** Format: uuid */
                                uploadedBy: string;
                                /** Format: date-time */
                                createdAt: string;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/documents/{id}/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 새 버전 추가 (최신본이 기본으로 보이고 이전본은 보존, 개정일·사유 기록) */
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
                        fileId: string;
                        /** Format: date */
                        revisionDate?: string;
                        reason?: string;
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
                            /** @enum {string} */
                            category: "DRAWING" | "SPEC" | "WORK_ORDER" | "CONTRACT" | "SAFETY" | "OTHER";
                            title: string;
                            isSensitive: boolean;
                            isPinned: boolean;
                            /** Format: uuid */
                            createdBy: string;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                            versionCount: number;
                            latest: {
                                versionNo: number;
                                /** Format: uuid */
                                fileId: string;
                                fileName: string;
                                contentType: string;
                                size: number;
                                /** @enum {string} */
                                fileStatus: "PENDING" | "PROCESSING" | "READY" | "REJECTED";
                                /** @enum {string|null} */
                                rejectReason: "CONTENT_MISMATCH" | "SIZE_MISMATCH" | "NOT_UPLOADED" | "UNREADABLE_IMAGE" | null;
                                /** Format: date */
                                revisionDate: string;
                                reason: string | null;
                                /** Format: uuid */
                                uploadedBy: string;
                                /** Format: date-time */
                                createdAt: string;
                            };
                            versions: {
                                versionNo: number;
                                /** Format: uuid */
                                fileId: string;
                                fileName: string;
                                contentType: string;
                                size: number;
                                /** @enum {string} */
                                fileStatus: "PENDING" | "PROCESSING" | "READY" | "REJECTED";
                                /** @enum {string|null} */
                                rejectReason: "CONTENT_MISMATCH" | "SIZE_MISMATCH" | "NOT_UPLOADED" | "UNREADABLE_IMAGE" | null;
                                /** Format: date */
                                revisionDate: string;
                                reason: string | null;
                                /** Format: uuid */
                                uploadedBy: string;
                                /** Format: date-time */
                                createdAt: string;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/documents/{id}/versions/{versionNo}/url": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 열람·내려받기 주소 발급 (짧은 만료, 민감 자료는 열람 기록을 남긴 뒤에만 발급) */
        get: {
            parameters: {
                query?: {
                    mode?: "view" | "download";
                };
                header?: never;
                path: {
                    id: string;
                    versionNo: number;
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
                            /** Format: uri */
                            url: string;
                            /** Format: date-time */
                            expiresAt: string;
                            isLogged: boolean;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/documents/{id}/access-logs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 민감 자료 열람·내려받기 기록 (최근순, 수정·삭제할 수 없는 감사 기록) */
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
                                action: "DOCUMENT_VIEWED" | "DOCUMENT_DOWNLOADED" | "REPORT_EXPORTED";
                                /** Format: uuid */
                                actorId: string;
                                actorName: string;
                                versionNo: number;
                                /** Format: date-time */
                                createdAt: string;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 통합 검색 (프로젝트·직원·메모·자료·일지, 종류마다 최대 개수, projectId로 프로젝트 안에서만 검색) */
        get: {
            parameters: {
                query: {
                    q: string;
                    projectId?: string;
                    limit?: number;
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
                            q: string;
                            projects: {
                                items: {
                                    /** @enum {string} */
                                    type: "PROJECT" | "EMPLOYEE" | "MEMO" | "DOCUMENT" | "WORK_LOG";
                                    /** Format: uuid */
                                    id: string;
                                    title: string;
                                    snippet: string | null;
                                    /** Format: uuid */
                                    projectId: string | null;
                                    projectName: string | null;
                                    /** Format: date */
                                    date: string | null;
                                    /** @enum {string|null} */
                                    badge: "SENSITIVE" | "LEFT" | null;
                                }[];
                                hasMore: boolean;
                            };
                            employees: {
                                items: {
                                    /** @enum {string} */
                                    type: "PROJECT" | "EMPLOYEE" | "MEMO" | "DOCUMENT" | "WORK_LOG";
                                    /** Format: uuid */
                                    id: string;
                                    title: string;
                                    snippet: string | null;
                                    /** Format: uuid */
                                    projectId: string | null;
                                    projectName: string | null;
                                    /** Format: date */
                                    date: string | null;
                                    /** @enum {string|null} */
                                    badge: "SENSITIVE" | "LEFT" | null;
                                }[];
                                hasMore: boolean;
                            };
                            memos: {
                                items: {
                                    /** @enum {string} */
                                    type: "PROJECT" | "EMPLOYEE" | "MEMO" | "DOCUMENT" | "WORK_LOG";
                                    /** Format: uuid */
                                    id: string;
                                    title: string;
                                    snippet: string | null;
                                    /** Format: uuid */
                                    projectId: string | null;
                                    projectName: string | null;
                                    /** Format: date */
                                    date: string | null;
                                    /** @enum {string|null} */
                                    badge: "SENSITIVE" | "LEFT" | null;
                                }[];
                                hasMore: boolean;
                            };
                            documents: {
                                items: {
                                    /** @enum {string} */
                                    type: "PROJECT" | "EMPLOYEE" | "MEMO" | "DOCUMENT" | "WORK_LOG";
                                    /** Format: uuid */
                                    id: string;
                                    title: string;
                                    snippet: string | null;
                                    /** Format: uuid */
                                    projectId: string | null;
                                    projectName: string | null;
                                    /** Format: date */
                                    date: string | null;
                                    /** @enum {string|null} */
                                    badge: "SENSITIVE" | "LEFT" | null;
                                }[];
                                hasMore: boolean;
                            };
                            workLogs: {
                                items: {
                                    /** @enum {string} */
                                    type: "PROJECT" | "EMPLOYEE" | "MEMO" | "DOCUMENT" | "WORK_LOG";
                                    /** Format: uuid */
                                    id: string;
                                    title: string;
                                    snippet: string | null;
                                    /** Format: uuid */
                                    projectId: string | null;
                                    projectName: string | null;
                                    /** Format: date */
                                    date: string | null;
                                    /** @enum {string|null} */
                                    badge: "SENSITIVE" | "LEFT" | null;
                                }[];
                                hasMore: boolean;
                            };
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/projects/{projectId}/daily-reports/{date}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 작업일보 한 장 (그날의 일지·인원·공수·자재·사진, 인쇄·PDF용) */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    projectId: string;
                    date: string;
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
                            project: {
                                /** Format: uuid */
                                id: string;
                                code: string;
                                name: string;
                                siteName: string;
                                siteAddress: string | null;
                                clientName: string | null;
                            };
                            /** Format: date */
                            date: string;
                            workLog: {
                                /** @enum {string} */
                                status: "DRAFT" | "SAVED";
                                content: string;
                                area: string | null;
                                notes: string | null;
                                isChange: boolean;
                                isAfterService: boolean;
                            } | null;
                            entries: {
                                /** Format: uuid */
                                employeeId: string;
                                employeeName: string;
                                jobTypeName: string | null;
                                categoryName: string;
                                minutes: number;
                            }[];
                            totals: {
                                headcount: number;
                                minutes: number;
                            };
                            settings: {
                                /** @enum {string} */
                                workUnitMode: "RATIO" | "HOURS";
                                standardWorkMinutes: number;
                            };
                            materials: {
                                materialName: string;
                                spec: string | null;
                                unit: string;
                                /** @enum {string} */
                                kind: "RECEIVED" | "USED" | "RETURNED" | "DISCARDED";
                                quantity: number;
                                categoryName: string | null;
                                area: string | null;
                                isChange: boolean;
                                isAfterService: boolean;
                                memo: string | null;
                            }[];
                            photos: {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                category: "BEFORE" | "DURING" | "AFTER" | "DEFECT" | "MATERIAL" | "SAFETY" | "OTHER";
                                area: string | null;
                                description: string | null;
                                /** Format: date-time */
                                takenAt: string;
                                /** Format: uri */
                                thumbnailUrl: string | null;
                                isProcessing: boolean;
                            }[];
                            hasMorePhotos: boolean;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
    "/api/v1/projects/{projectId}/daily-reports.xlsx": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 작업일보 엑셀 내보내기 (기간 안의 일지·공수·자재 시트, 내보낸 기록이 남음) */
        get: {
            parameters: {
                query: {
                    from: string;
                    to: string;
                };
                header?: never;
                path: {
                    projectId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description 파일 내려받기 (Content-Disposition 헤더에 파일 이름) */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": string;
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
                                code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CSRF_REJECTED" | "INVALID_CREDENTIALS" | "CURRENT_PASSWORD_INVALID" | "LAST_LOGIN_METHOD" | "ACCOUNT_CLOSING" | "ACCOUNT_LOCKED" | "LOGIN_ID_TAKEN" | "EMAIL_CODE_INVALID" | "NOT_IMPLEMENTED" | "NOT_FOUND" | "CONFLICT" | "STORAGE_QUOTA_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_IN_PROGRESS" | "TOO_MANY_REQUESTS" | "INTERNAL_ERROR";
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
