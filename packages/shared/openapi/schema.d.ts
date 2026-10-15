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
    "/api/v1/company/rules": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 회사 경고 기준·보증 기본 기간 조회 (저장한 적이 없으면 기본값) */
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
                            burnWarnPercent: number;
                            burnLimitPercent: number;
                            aheadGapPercent: number;
                            warrantyDefaultMonths: number;
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
        /** 회사 경고 기준·보증 기본 기간 변경 (공수 소진율 경고·한도, 진행률 간격, 보증 기본 개월 수) */
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
                        burnWarnPercent: number;
                        burnLimitPercent: number;
                        aheadGapPercent: number;
                        warrantyDefaultMonths: number;
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
                            burnWarnPercent: number;
                            burnLimitPercent: number;
                            aheadGapPercent: number;
                            warrantyDefaultMonths: number;
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
                                ipAddress: string | null;
                                lastIp: string | null;
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
                                kind: "JOB_TYPE" | "WORK_CATEGORY" | "TRADE" | "WORKER_TYPE" | "CREDENTIAL_TYPE" | "EXPENSE_CATEGORY" | "INCOME_CATEGORY";
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
                        kind: "JOB_TYPE" | "WORK_CATEGORY" | "TRADE" | "WORKER_TYPE" | "CREDENTIAL_TYPE" | "EXPENSE_CATEGORY" | "INCOME_CATEGORY";
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
                            kind: "JOB_TYPE" | "WORK_CATEGORY" | "TRADE" | "WORKER_TYPE" | "CREDENTIAL_TYPE" | "EXPENSE_CATEGORY" | "INCOME_CATEGORY";
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
                        kind: "JOB_TYPE" | "WORK_CATEGORY" | "TRADE" | "WORKER_TYPE" | "CREDENTIAL_TYPE" | "EXPENSE_CATEGORY" | "INCOME_CATEGORY";
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
                            kind: "JOB_TYPE" | "WORK_CATEGORY" | "TRADE" | "WORKER_TYPE" | "CREDENTIAL_TYPE" | "EXPENSE_CATEGORY" | "INCOME_CATEGORY";
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
        /** 명부 삭제 (프로젝트·자재 기록에서 쓰고 있으면 거부, 그때는 숨기기) */
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
                /** @description VALIDATION_ERROR */
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
        /** 프로젝트 목록 (상태·고객·담당자·공종·기간·검색 필터, 정렬, 쪽 나누기) */
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
                    site?: string;
                    hasWarning?: "true";
                    sortBy?: "recent" | "name" | "status" | "client" | "manager" | "plannedStart" | "plannedEnd";
                    sortDir?: "asc" | "desc";
                    page?: number;
                    pageSize?: number;
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
                                warnings: ("BURN_WARN" | "BURN_LIMIT" | "BURN_AHEAD" | "OVERDUE" | "BEHIND_SCHEDULE")[];
                            }[];
                            total: number;
                            page: number;
                            pageSize: number;
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
        /** 프로젝트 상태 전환 (예정 → 진행 → 중단·완료 → 보증 중 → 종료, 취소, 종료 재오픈). 날짜·사유와 함께 이력에 남음 */
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
                        confirmSummary?: boolean;
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
    "/api/v1/staffing-calendar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 인력 배치 캘린더 (기간 안의 직원과 투입, 최대 42일) */
        get: {
            parameters: {
                query: {
                    from: string;
                    to: string;
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
                            /** Format: date */
                            from: string;
                            /** Format: date */
                            to: string;
                            employees: {
                                /** Format: uuid */
                                id: string;
                                name: string;
                                title: string | null;
                                /** @enum {string} */
                                status: "ACTIVE" | "ON_LEAVE" | "LEFT";
                                /** Format: date */
                                leftOn: string | null;
                            }[];
                            assignments: {
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                employeeId: string;
                                /** Format: uuid */
                                projectId: string;
                                projectCode: string;
                                projectName: string;
                                /** @enum {string} */
                                projectStatus: "PLANNED" | "IN_PROGRESS" | "SUSPENDED" | "COMPLETED" | "WARRANTY" | "CLOSED" | "CANCELLED";
                                /** Format: date */
                                startDate: string;
                                /** Format: date */
                                endDate: string;
                            }[];
                            workDays: {
                                /** Format: uuid */
                                employeeId: string;
                                /** Format: date */
                                workDate: string;
                                /** Format: uuid */
                                projectId: string;
                                projectCode: string;
                                projectName: string;
                                /** @enum {string} */
                                projectStatus: "PLANNED" | "IN_PROGRESS" | "SUSPENDED" | "COMPLETED" | "WARRANTY" | "CLOSED" | "CANCELLED";
                                minutes: number;
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
                                    type: "CREDENTIAL";
                                    /** Format: uuid */
                                    typeId: string;
                                    typeName: string;
                                    /** @enum {string} */
                                    reason: "MISSING" | "EXPIRED" | "EXPIRES_DURING";
                                    /** Format: date */
                                    expiresOn: string | null;
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
                                type: "CREDENTIAL";
                                /** Format: uuid */
                                typeId: string;
                                typeName: string;
                                /** @enum {string} */
                                reason: "MISSING" | "EXPIRED" | "EXPIRES_DURING";
                                /** Format: date */
                                expiresOn: string | null;
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
                                type: "CREDENTIAL";
                                /** Format: uuid */
                                typeId: string;
                                typeName: string;
                                /** @enum {string} */
                                reason: "MISSING" | "EXPIRED" | "EXPIRES_DURING";
                                /** Format: date */
                                expiresOn: string | null;
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
                                type: "CREDENTIAL";
                                /** Format: uuid */
                                typeId: string;
                                typeName: string;
                                /** @enum {string} */
                                reason: "MISSING" | "EXPIRED" | "EXPIRES_DURING";
                                /** Format: date */
                                expiresOn: string | null;
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
        /** 프로젝트 작업 내역 목록 (날짜·상태 필터, 공수 합과 임시 저장 표시) */
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
                                workers: {
                                    /** Format: uuid */
                                    employeeId: string;
                                    minutes: number;
                                }[];
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
        /** 프로젝트 공수 집계 (직원별·작업 구분별·기간별, 저장된 작업 내역만 반영) */
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
                                /** Format: date */
                                firstWorkDate: string | null;
                                /** Format: date */
                                lastWorkDate: string | null;
                                categories: {
                                    /** Format: uuid */
                                    categoryId: string;
                                    totalMinutes: number;
                                }[];
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
    "/api/v1/projects/{id}/work-summary/employees/{employeeId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 한 사람이 이 프로젝트에서 일한 날 (날짜별 시간·한 일, 저장된 작업 내역만 반영) */
        get: {
            parameters: {
                query?: {
                    from?: string;
                    to?: string;
                };
                header?: never;
                path: {
                    id: string;
                    employeeId: string;
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
                            days: {
                                /** Format: date */
                                workDate: string;
                                minutes: number;
                                categories: {
                                    /** Format: uuid */
                                    categoryId: string;
                                    totalMinutes: number;
                                }[];
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
        /** 직원의 프로젝트별 투입 이력과 이번 달·올해 공수 (저장된 작업 내역만 반영) */
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
        /** 그날의 작업 내역 (공수 항목과 경고 포함) */
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
        /** 그날의 작업 내역 임시 저장·저장 (없으면 만들고 있으면 고침, 낙관적 잠금) */
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
        /** 작업 내역 수정 이력 (고치기 전 값, 최근이 맨 앞) */
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
    "/api/v1/projects/{id}/progress": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 진행률 기록 목록 (기준일 최근순) */
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
                                percent: number;
                                /** Format: date */
                                recordedOn: string;
                                note: string | null;
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
        /** 진행률 기록 추가 (예정·진행·중단에서만, 고치거나 지우지 않고 새로 기록) */
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
                        percent: number;
                        /** Format: date */
                        recordedOn?: string;
                        note?: string;
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
                            percent: number;
                            /** Format: date */
                            recordedOn: string;
                            note: string | null;
                            /** Format: date-time */
                            createdAt: string;
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
    "/api/v1/projects/{id}/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 프로젝트 진행 점검 (공수 소진율, 현재 진행률, 예상 필요 공수, 경고) */
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
                            plannedMinutes: number | null;
                            usedMinutes: number;
                            burnPercent: number | null;
                            progressPercent: number | null;
                            /** Format: date */
                            progressRecordedOn: string | null;
                            forecastMinutes: number | null;
                            warnings: ("BURN_WARN" | "BURN_LIMIT" | "BURN_AHEAD" | "OVERDUE" | "BEHIND_SCHEDULE")[];
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
    "/api/v1/pay-rates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 단가표: 단가가 있는 직원마다 현재·이전·적용 예정 단가 (직원 목록·단가표 탭) */
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
                                employeeId: string;
                                current: {
                                    /** Format: uuid */
                                    id: string;
                                    /** @enum {string} */
                                    payType: "DAILY" | "HOURLY" | "MONTHLY" | "ANNUAL";
                                    amount: number;
                                    /** Format: date */
                                    effectiveFrom: string;
                                    /** Format: date-time */
                                    createdAt: string;
                                } | null;
                                previous: {
                                    /** Format: uuid */
                                    id: string;
                                    /** @enum {string} */
                                    payType: "DAILY" | "HOURLY" | "MONTHLY" | "ANNUAL";
                                    amount: number;
                                    /** Format: date */
                                    effectiveFrom: string;
                                    /** Format: date-time */
                                    createdAt: string;
                                } | null;
                                upcoming: {
                                    /** Format: uuid */
                                    id: string;
                                    /** @enum {string} */
                                    payType: "DAILY" | "HOURLY" | "MONTHLY" | "ANNUAL";
                                    amount: number;
                                    /** Format: date */
                                    effectiveFrom: string;
                                    /** Format: date-time */
                                    createdAt: string;
                                } | null;
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
    "/api/v1/employees/{id}/pay-rates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 직원 단가 기록 (적용 시작일 최근순) */
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
                                payType: "DAILY" | "HOURLY" | "MONTHLY" | "ANNUAL";
                                amount: number;
                                /** Format: date */
                                effectiveFrom: string;
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
        /** 직원 단가 추가 (기존 단가는 고치지 않고 적용 시작일부터 새 단가, 단가 변경 기록으로 남음) */
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
                        payType: "DAILY" | "HOURLY" | "MONTHLY" | "ANNUAL";
                        amount: number;
                        /** Format: date */
                        effectiveFrom: string;
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
                            payType: "DAILY" | "HOURLY" | "MONTHLY" | "ANNUAL";
                            amount: number;
                            /** Format: date */
                            effectiveFrom: string;
                            /** Format: date-time */
                            createdAt: string;
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
    "/api/v1/projects/{id}/labor-cost": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 프로젝트 인건비 최소 추정 (실제 공수 × 근무일 단가, 계획 공수 기준 예상) */
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
                            actual: {
                                totalAmount: number;
                                totalMinutes: number;
                                unpricedMinutes: number;
                                employees: {
                                    /** Format: uuid */
                                    employeeId: string;
                                    minutes: number;
                                    unpricedMinutes: number;
                                    amount: number;
                                }[];
                            };
                            planned: {
                                totalAmount: number;
                                totalMinutes: number;
                                unpricedMinutes: number;
                                employees: {
                                    /** Format: uuid */
                                    employeeId: string;
                                    minutes: number;
                                    unpricedMinutes: number;
                                    amount: number;
                                }[];
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
    "/api/v1/projects/{id}/change-works": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 프로젝트 변경·추가 작업 목록 (번호 큰 것이 먼저, 상태 필터) */
        get: {
            parameters: {
                query?: {
                    status?: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
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
                                seq: number;
                                /** Format: date */
                                requestedOn: string;
                                requester: string;
                                content: string;
                                /** @enum {string} */
                                status: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                                /** Format: date */
                                statusChangedOn: string;
                                documentCount: number;
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
        put?: never;
        /** 변경·추가 작업 기록 (예정·진행·중단, 완료는 확인 필요, 협의 중으로 시작) */
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
                        /** Format: date */
                        requestedOn?: string;
                        requester: string;
                        content: string;
                        confirmCompleted?: boolean;
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
                            seq: number;
                            /** Format: date */
                            requestedOn: string;
                            requester: string;
                            content: string;
                            /** @enum {string} */
                            status: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                            /** Format: date */
                            statusChangedOn: string;
                            documentCount: number;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                            history: {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                fromStatus: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                                /** @enum {string} */
                                toStatus: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                                /** Format: date */
                                effectiveOn: string;
                                note: string | null;
                                /** Format: date-time */
                                changedAt: string;
                            }[];
                            documents: {
                                /** Format: uuid */
                                documentId: string;
                                title: string;
                                /** @enum {string} */
                                category: "DRAWING" | "CONTRACT" | "SAFETY" | "QUOTE" | "OTHER";
                                isSensitive: boolean;
                                latestVersionNo: number;
                                contentType: string;
                                /** Format: date-time */
                                linkedAt: string;
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
    "/api/v1/projects/{id}/change-usage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 변경·추가 작업으로 쓴 공수·자재 (작업 내역·자재 기록의 변경 작업 표시 합계) */
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
                            workLogCount: number;
                            minutes: number;
                            materials: {
                                /** Format: uuid */
                                materialId: string;
                                name: string;
                                spec: string | null;
                                unit: string;
                                quantity: number;
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
    "/api/v1/change-works/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 변경·추가 작업 상세 (상태 이력과 증빙 문서 포함) */
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
                            seq: number;
                            /** Format: date */
                            requestedOn: string;
                            requester: string;
                            content: string;
                            /** @enum {string} */
                            status: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                            /** Format: date */
                            statusChangedOn: string;
                            documentCount: number;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                            history: {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                fromStatus: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                                /** @enum {string} */
                                toStatus: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                                /** Format: date */
                                effectiveOn: string;
                                note: string | null;
                                /** Format: date-time */
                                changedAt: string;
                            }[];
                            documents: {
                                /** Format: uuid */
                                documentId: string;
                                title: string;
                                /** @enum {string} */
                                category: "DRAWING" | "CONTRACT" | "SAFETY" | "QUOTE" | "OTHER";
                                isSensitive: boolean;
                                latestVersionNo: number;
                                contentType: string;
                                /** Format: date-time */
                                linkedAt: string;
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
        /** 변경·추가 작업 수정 (협의 중일 때만 요청일·요청자·내용) */
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
                        requestedOn?: string;
                        requester?: string;
                        content?: string;
                        confirmCompleted?: boolean;
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
                            seq: number;
                            /** Format: date */
                            requestedOn: string;
                            requester: string;
                            content: string;
                            /** @enum {string} */
                            status: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                            /** Format: date */
                            statusChangedOn: string;
                            documentCount: number;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                            history: {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                fromStatus: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                                /** @enum {string} */
                                toStatus: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                                /** Format: date */
                                effectiveOn: string;
                                note: string | null;
                                /** Format: date-time */
                                changedAt: string;
                            }[];
                            documents: {
                                /** Format: uuid */
                                documentId: string;
                                title: string;
                                /** @enum {string} */
                                category: "DRAWING" | "CONTRACT" | "SAFETY" | "QUOTE" | "OTHER";
                                isSensitive: boolean;
                                latestVersionNo: number;
                                contentType: string;
                                /** Format: date-time */
                                linkedAt: string;
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
    "/api/v1/change-works/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 변경·추가 작업 상태 변경 (협의 중·합의됨·철회, 철회는 사유 필수, 이력으로 남음) */
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
                        toStatus: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                        /** Format: date */
                        effectiveOn?: string;
                        note?: string;
                        confirmCompleted?: boolean;
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
                            seq: number;
                            /** Format: date */
                            requestedOn: string;
                            requester: string;
                            content: string;
                            /** @enum {string} */
                            status: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                            /** Format: date */
                            statusChangedOn: string;
                            documentCount: number;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                            history: {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                fromStatus: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                                /** @enum {string} */
                                toStatus: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                                /** Format: date */
                                effectiveOn: string;
                                note: string | null;
                                /** Format: date-time */
                                changedAt: string;
                            }[];
                            documents: {
                                /** Format: uuid */
                                documentId: string;
                                title: string;
                                /** @enum {string} */
                                category: "DRAWING" | "CONTRACT" | "SAFETY" | "QUOTE" | "OTHER";
                                isSensitive: boolean;
                                latestVersionNo: number;
                                contentType: string;
                                /** Format: date-time */
                                linkedAt: string;
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
    "/api/v1/change-works/{id}/documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 증빙 문서 연결 (같은 프로젝트의 문서함 문서) */
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
                        documentId: string;
                        confirmCompleted?: boolean;
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
                            seq: number;
                            /** Format: date */
                            requestedOn: string;
                            requester: string;
                            content: string;
                            /** @enum {string} */
                            status: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                            /** Format: date */
                            statusChangedOn: string;
                            documentCount: number;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                            history: {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                fromStatus: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                                /** @enum {string} */
                                toStatus: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                                /** Format: date */
                                effectiveOn: string;
                                note: string | null;
                                /** Format: date-time */
                                changedAt: string;
                            }[];
                            documents: {
                                /** Format: uuid */
                                documentId: string;
                                title: string;
                                /** @enum {string} */
                                category: "DRAWING" | "CONTRACT" | "SAFETY" | "QUOTE" | "OTHER";
                                isSensitive: boolean;
                                latestVersionNo: number;
                                contentType: string;
                                /** Format: date-time */
                                linkedAt: string;
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
    "/api/v1/change-works/{id}/evidence": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 증빙 올리기 (올린 파일로 문서함에 계약·공문 문서를 만들고 이 변경·추가 작업에 한 번에 연결, 같은 파일로 다시 부르면 이미 만든 증빙을 돌려줌) */
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
                        title: string;
                        confirmCompleted?: boolean;
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
                            seq: number;
                            /** Format: date */
                            requestedOn: string;
                            requester: string;
                            content: string;
                            /** @enum {string} */
                            status: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                            /** Format: date */
                            statusChangedOn: string;
                            documentCount: number;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                            history: {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                fromStatus: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                                /** @enum {string} */
                                toStatus: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                                /** Format: date */
                                effectiveOn: string;
                                note: string | null;
                                /** Format: date-time */
                                changedAt: string;
                            }[];
                            documents: {
                                /** Format: uuid */
                                documentId: string;
                                title: string;
                                /** @enum {string} */
                                category: "DRAWING" | "CONTRACT" | "SAFETY" | "QUOTE" | "OTHER";
                                isSensitive: boolean;
                                latestVersionNo: number;
                                contentType: string;
                                /** Format: date-time */
                                linkedAt: string;
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
    "/api/v1/change-works/{id}/documents/{documentId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** 증빙 문서 연결 해제 (연결 기록은 남고 해제 시각만 기록) */
        delete: {
            parameters: {
                query?: {
                    confirmCompleted?: "true";
                };
                header?: never;
                path: {
                    id: string;
                    documentId: string;
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
                            seq: number;
                            /** Format: date */
                            requestedOn: string;
                            requester: string;
                            content: string;
                            /** @enum {string} */
                            status: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                            /** Format: date */
                            statusChangedOn: string;
                            documentCount: number;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                            history: {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                fromStatus: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                                /** @enum {string} */
                                toStatus: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                                /** Format: date */
                                effectiveOn: string;
                                note: string | null;
                                /** Format: date-time */
                                changedAt: string;
                            }[];
                            documents: {
                                /** Format: uuid */
                                documentId: string;
                                title: string;
                                /** @enum {string} */
                                category: "DRAWING" | "CONTRACT" | "SAFETY" | "QUOTE" | "OTHER";
                                isSensitive: boolean;
                                latestVersionNo: number;
                                contentType: string;
                                /** Format: date-time */
                                linkedAt: string;
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
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}/warranty": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 프로젝트 보증 설정·보증서·변경 이력 (설정이 없으면 기본 기간으로 계산한 값) */
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
                            configured: boolean;
                            months: number;
                            /** @enum {string} */
                            startBasis: "ACTUAL_END" | "INSPECTION" | "MANUAL";
                            /** Format: date */
                            startOn: string | null;
                            /** Format: date */
                            endOn: string | null;
                            defaultMonths: number;
                            daysLeft: number | null;
                            certificates: {
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                documentId: string;
                                title: string;
                                isSensitive: boolean;
                                issuer: string | null;
                                /** Format: date */
                                expiresOn: string;
                                daysLeft: number;
                                /** Format: date-time */
                                createdAt: string;
                            }[];
                            changes: {
                                /** Format: uuid */
                                id: string;
                                fromMonths: number | null;
                                toMonths: number;
                                /** Format: date */
                                fromEndOn: string | null;
                                /** Format: date */
                                toEndOn: string;
                                /** @enum {string} */
                                startBasis: "ACTUAL_END" | "INSPECTION" | "MANUAL";
                                /** Format: date */
                                startOn: string;
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
        /** 보증 설정 저장 (완료·보증 중에서만, 종료 예정일은 시작일 + 기간, 바꿀 때는 사유 필수, 이력에 남음) */
        put: {
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
                        months: number;
                        /** @enum {string} */
                        startBasis: "ACTUAL_END" | "INSPECTION" | "MANUAL";
                        /** Format: date */
                        startOn?: string | null;
                        /** Format: date */
                        endOn?: string | null;
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
                            configured: boolean;
                            months: number;
                            /** @enum {string} */
                            startBasis: "ACTUAL_END" | "INSPECTION" | "MANUAL";
                            /** Format: date */
                            startOn: string | null;
                            /** Format: date */
                            endOn: string | null;
                            defaultMonths: number;
                            daysLeft: number | null;
                            certificates: {
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                documentId: string;
                                title: string;
                                isSensitive: boolean;
                                issuer: string | null;
                                /** Format: date */
                                expiresOn: string;
                                daysLeft: number;
                                /** Format: date-time */
                                createdAt: string;
                            }[];
                            changes: {
                                /** Format: uuid */
                                id: string;
                                fromMonths: number | null;
                                toMonths: number;
                                /** Format: date */
                                fromEndOn: string | null;
                                /** Format: date */
                                toEndOn: string;
                                /** @enum {string} */
                                startBasis: "ACTUAL_END" | "INSPECTION" | "MANUAL";
                                /** Format: date */
                                startOn: string;
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
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}/warranty/certificates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 보증서 등록 (문서함의 같은 프로젝트 문서 + 만료일) */
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
                        documentId: string;
                        /** Format: date */
                        expiresOn: string;
                        issuer?: string | null;
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
                            configured: boolean;
                            months: number;
                            /** @enum {string} */
                            startBasis: "ACTUAL_END" | "INSPECTION" | "MANUAL";
                            /** Format: date */
                            startOn: string | null;
                            /** Format: date */
                            endOn: string | null;
                            defaultMonths: number;
                            daysLeft: number | null;
                            certificates: {
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                documentId: string;
                                title: string;
                                isSensitive: boolean;
                                issuer: string | null;
                                /** Format: date */
                                expiresOn: string;
                                daysLeft: number;
                                /** Format: date-time */
                                createdAt: string;
                            }[];
                            changes: {
                                /** Format: uuid */
                                id: string;
                                fromMonths: number | null;
                                toMonths: number;
                                /** Format: date */
                                fromEndOn: string | null;
                                /** Format: date */
                                toEndOn: string;
                                /** @enum {string} */
                                startBasis: "ACTUAL_END" | "INSPECTION" | "MANUAL";
                                /** Format: date */
                                startOn: string;
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
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}/warranty/certificates/{certificateId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** 보증서 삭제 (기록은 남고 삭제 시각만 기록) */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    certificateId: string;
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
                            configured: boolean;
                            months: number;
                            /** @enum {string} */
                            startBasis: "ACTUAL_END" | "INSPECTION" | "MANUAL";
                            /** Format: date */
                            startOn: string | null;
                            /** Format: date */
                            endOn: string | null;
                            defaultMonths: number;
                            daysLeft: number | null;
                            certificates: {
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                documentId: string;
                                title: string;
                                isSensitive: boolean;
                                issuer: string | null;
                                /** Format: date */
                                expiresOn: string;
                                daysLeft: number;
                                /** Format: date-time */
                                createdAt: string;
                            }[];
                            changes: {
                                /** Format: uuid */
                                id: string;
                                fromMonths: number | null;
                                toMonths: number;
                                /** Format: date */
                                fromEndOn: string | null;
                                /** Format: date */
                                toEndOn: string;
                                /** @enum {string} */
                                startBasis: "ACTUAL_END" | "INSPECTION" | "MANUAL";
                                /** Format: date */
                                startOn: string;
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
        options?: never;
        head?: never;
        /** 보증서 만료일·발급처 수정 */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    certificateId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: date */
                        expiresOn?: string;
                        issuer?: string | null;
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
                            configured: boolean;
                            months: number;
                            /** @enum {string} */
                            startBasis: "ACTUAL_END" | "INSPECTION" | "MANUAL";
                            /** Format: date */
                            startOn: string | null;
                            /** Format: date */
                            endOn: string | null;
                            defaultMonths: number;
                            daysLeft: number | null;
                            certificates: {
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                documentId: string;
                                title: string;
                                isSensitive: boolean;
                                issuer: string | null;
                                /** Format: date */
                                expiresOn: string;
                                daysLeft: number;
                                /** Format: date-time */
                                createdAt: string;
                            }[];
                            changes: {
                                /** Format: uuid */
                                id: string;
                                fromMonths: number | null;
                                toMonths: number;
                                /** Format: date */
                                fromEndOn: string | null;
                                /** Format: date */
                                toEndOn: string;
                                /** @enum {string} */
                                startBasis: "ACTUAL_END" | "INSPECTION" | "MANUAL";
                                /** Format: date */
                                startOn: string;
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
        trace?: never;
    };
    "/api/v1/employees/{id}/credentials": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 직원 서류·자격 목록 (만료가 빠른 순, 오늘 기준 상태 포함) */
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
                                /** Format: uuid */
                                employeeId: string;
                                /** Format: uuid */
                                typeId: string;
                                typeName: string;
                                /** Format: date */
                                issuedOn: string | null;
                                /** Format: date */
                                expiresOn: string | null;
                                /** @enum {string} */
                                status: "VALID" | "EXPIRING" | "EXPIRED";
                                daysLeft: number | null;
                                memo: string | null;
                                file: {
                                    /** Format: uuid */
                                    id: string;
                                    name: string;
                                    contentType: string;
                                    size: number;
                                    /** @enum {string} */
                                    status: "PENDING" | "PROCESSING" | "READY" | "REJECTED";
                                } | null;
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
        /** 직원 서류·자격 등록 (종류만 있어도 등록, 파일은 직원 서류로 올린 것 연결) */
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
                        typeId: string;
                        /** Format: date */
                        issuedOn?: string | null;
                        /** Format: date */
                        expiresOn?: string | null;
                        /** Format: uuid */
                        fileId?: string | null;
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
                            /** Format: uuid */
                            employeeId: string;
                            /** Format: uuid */
                            typeId: string;
                            typeName: string;
                            /** Format: date */
                            issuedOn: string | null;
                            /** Format: date */
                            expiresOn: string | null;
                            /** @enum {string} */
                            status: "VALID" | "EXPIRING" | "EXPIRED";
                            daysLeft: number | null;
                            memo: string | null;
                            file: {
                                /** Format: uuid */
                                id: string;
                                name: string;
                                contentType: string;
                                size: number;
                                /** @enum {string} */
                                status: "PENDING" | "PROCESSING" | "READY" | "REJECTED";
                            } | null;
                            /** Format: date-time */
                            createdAt: string;
                        };
                    };
                };
                /** @description VALIDATION_ERROR */
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
    "/api/v1/employees/{id}/credentials/{credentialId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** 직원 서류·자격 삭제 (기록은 남고 목록에서만 사라짐) */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    credentialId: string;
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
        /** 직원 서류·자격 수정 (종류·날짜·파일·메모, 갱신하면 만료일을 바꿈) */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    credentialId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: uuid */
                        typeId?: string;
                        /** Format: date */
                        issuedOn?: string | null;
                        /** Format: date */
                        expiresOn?: string | null;
                        /** Format: uuid */
                        fileId?: string | null;
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
                            employeeId: string;
                            /** Format: uuid */
                            typeId: string;
                            typeName: string;
                            /** Format: date */
                            issuedOn: string | null;
                            /** Format: date */
                            expiresOn: string | null;
                            /** @enum {string} */
                            status: "VALID" | "EXPIRING" | "EXPIRED";
                            daysLeft: number | null;
                            memo: string | null;
                            file: {
                                /** Format: uuid */
                                id: string;
                                name: string;
                                contentType: string;
                                size: number;
                                /** @enum {string} */
                                status: "PENDING" | "PROCESSING" | "READY" | "REJECTED";
                            } | null;
                            /** Format: date-time */
                            createdAt: string;
                        };
                    };
                };
                /** @description VALIDATION_ERROR */
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
    "/api/v1/employees/{id}/credentials/{credentialId}/file-url": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 서류 파일 열람 주소 발급 (열람 기록을 남기고 짧은 만료의 주소 발급) */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    credentialId: string;
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
                /** @description VALIDATION_ERROR */
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
    "/api/v1/projects/{id}/required-credentials": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 프로젝트 필요 자격 (투입 배정 때 자격이 없거나 만료된 직원을 경고하는 기준) */
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
                                typeId: string;
                                typeName: string;
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
        /** 프로젝트 필요 자격 저장 (보낸 목록으로 바꿈) */
        put: {
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
                        typeIds: string[];
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
                            items: {
                                /** Format: uuid */
                                typeId: string;
                                typeName: string;
                            }[];
                        };
                    };
                };
                /** @description VALIDATION_ERROR */
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
    "/api/v1/audit-logs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 기록 조회 (민감 자료·직원 서류 열람, 내보내기, 단가·인건비 조회, 월 공수 확정·재오픈, 최근순 커서 방식) */
        get: {
            parameters: {
                query?: {
                    action?: "DOCUMENT_VIEWED" | "DOCUMENT_DOWNLOADED" | "REPORT_EXPORTED" | "PAY_RATE_VIEWED" | "PAY_RATE_CHANGED" | "LABOR_COST_VIEWED" | "EMPLOYEE_DOCUMENT_VIEWED" | "MONTH_CLOSED" | "MONTH_REOPENED" | "WORK_LOG_SAVED" | "WORK_LOG_UPDATED" | "MATERIAL_RECORD_DELETED" | "LEDGER_ENTRY_DELETED" | "PHOTO_DELETED" | "DOCUMENT_DELETED" | "PROJECT_UPDATED" | "PROJECT_STATUS_CHANGED" | "EMPLOYEE_UPDATED";
                    kind?: "SAVE" | "UPDATE" | "DELETE" | "EXPORT" | "CONFIRM" | "VIEW";
                    projectId?: string;
                    from?: string;
                    to?: string;
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
                                /** @enum {string} */
                                action: "DOCUMENT_VIEWED" | "DOCUMENT_DOWNLOADED" | "REPORT_EXPORTED" | "PAY_RATE_VIEWED" | "PAY_RATE_CHANGED" | "LABOR_COST_VIEWED" | "EMPLOYEE_DOCUMENT_VIEWED" | "MONTH_CLOSED" | "MONTH_REOPENED" | "WORK_LOG_SAVED" | "WORK_LOG_UPDATED" | "MATERIAL_RECORD_DELETED" | "LEDGER_ENTRY_DELETED" | "PHOTO_DELETED" | "DOCUMENT_DELETED" | "PROJECT_UPDATED" | "PROJECT_STATUS_CHANGED" | "EMPLOYEE_UPDATED";
                                /** @enum {string} */
                                kind: "SAVE" | "UPDATE" | "DELETE" | "EXPORT" | "CONFIRM" | "VIEW";
                                /** Format: uuid */
                                actorId: string;
                                actorName: string;
                                /** @enum {string} */
                                targetType: "DOCUMENT" | "EMPLOYEE" | "PROJECT" | "COMPANY";
                                /** Format: uuid */
                                targetId: string;
                                targetName: string | null;
                                /** Format: uuid */
                                projectId: string | null;
                                projectName: string | null;
                                summary: string | null;
                                changes: {
                                    label: string;
                                    before: string | null;
                                    after: string | null;
                                }[];
                                /** Format: date-time */
                                createdAt: string;
                            }[];
                            nextCursor: string | null;
                        };
                    };
                };
                /** @description VALIDATION_ERROR */
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
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}/repair-requests": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 프로젝트 보수 요청 목록 (번호 큰 것이 먼저, 상태 필터) */
        get: {
            parameters: {
                query?: {
                    status?: "RECEIVED" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
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
                                seq: number;
                                /** Format: date */
                                receivedOn: string;
                                requester: string;
                                content: string;
                                location: string | null;
                                /** @enum {string} */
                                status: "RECEIVED" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
                                /** Format: date */
                                statusChangedOn: string;
                                /** Format: date */
                                resolvedOn: string | null;
                                linkCount: number;
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
        put?: never;
        /** 보수 요청 접수 (보증 중인 프로젝트에서만, 접수 상태로 시작) */
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
                        /** Format: date */
                        receivedOn?: string;
                        requester: string;
                        content: string;
                        location?: string | null;
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
                            seq: number;
                            /** Format: date */
                            receivedOn: string;
                            requester: string;
                            content: string;
                            location: string | null;
                            /** @enum {string} */
                            status: "RECEIVED" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
                            /** Format: date */
                            statusChangedOn: string;
                            /** Format: date */
                            resolvedOn: string | null;
                            linkCount: number;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                            history: {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                fromStatus: "RECEIVED" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
                                /** @enum {string} */
                                toStatus: "RECEIVED" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
                                /** Format: date */
                                effectiveOn: string;
                                note: string | null;
                                /** Format: date-time */
                                changedAt: string;
                            }[];
                            links: ({
                                /** @enum {string} */
                                kind: "WORK_LOG";
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                workLogId: string;
                                /** Format: date */
                                workDate: string;
                                content: string;
                                minutes: number;
                                /** Format: date-time */
                                linkedAt: string;
                            } | {
                                /** @enum {string} */
                                kind: "MATERIAL";
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                materialRecordId: string;
                                /** Format: date */
                                recordDate: string;
                                name: string;
                                spec: string | null;
                                unit: string;
                                /** @enum {string} */
                                recordKind: "RECEIVED" | "USED" | "RETURNED" | "DISCARDED";
                                quantity: number;
                                /** Format: date-time */
                                linkedAt: string;
                            })[];
                            usage: {
                                workLogCount: number;
                                minutes: number;
                                materials: {
                                    /** Format: uuid */
                                    materialId: string;
                                    name: string;
                                    spec: string | null;
                                    unit: string;
                                    quantity: number;
                                }[];
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
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}/after-service-usage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 사후 작업으로 쓴 공수·자재 (사후 작업 표시가 된 작업 내역·자재 기록 합계) */
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
                            workLogCount: number;
                            minutes: number;
                            materials: {
                                /** Format: uuid */
                                materialId: string;
                                name: string;
                                spec: string | null;
                                unit: string;
                                quantity: number;
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
    "/api/v1/repair-requests/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 보수 요청 상세 (상태 이력, 연결한 작업 내역·자재 기록, 쓴 공수·자재 포함) */
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
                            seq: number;
                            /** Format: date */
                            receivedOn: string;
                            requester: string;
                            content: string;
                            location: string | null;
                            /** @enum {string} */
                            status: "RECEIVED" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
                            /** Format: date */
                            statusChangedOn: string;
                            /** Format: date */
                            resolvedOn: string | null;
                            linkCount: number;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                            history: {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                fromStatus: "RECEIVED" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
                                /** @enum {string} */
                                toStatus: "RECEIVED" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
                                /** Format: date */
                                effectiveOn: string;
                                note: string | null;
                                /** Format: date-time */
                                changedAt: string;
                            }[];
                            links: ({
                                /** @enum {string} */
                                kind: "WORK_LOG";
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                workLogId: string;
                                /** Format: date */
                                workDate: string;
                                content: string;
                                minutes: number;
                                /** Format: date-time */
                                linkedAt: string;
                            } | {
                                /** @enum {string} */
                                kind: "MATERIAL";
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                materialRecordId: string;
                                /** Format: date */
                                recordDate: string;
                                name: string;
                                spec: string | null;
                                unit: string;
                                /** @enum {string} */
                                recordKind: "RECEIVED" | "USED" | "RETURNED" | "DISCARDED";
                                quantity: number;
                                /** Format: date-time */
                                linkedAt: string;
                            })[];
                            usage: {
                                workLogCount: number;
                                minutes: number;
                                materials: {
                                    /** Format: uuid */
                                    materialId: string;
                                    name: string;
                                    spec: string | null;
                                    unit: string;
                                    quantity: number;
                                }[];
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
        /** 보수 요청 수정 (완료 전까지만, 접수일·요청자·내용·위치) */
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
                        receivedOn?: string;
                        requester?: string;
                        content?: string;
                        location?: string | null;
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
                            seq: number;
                            /** Format: date */
                            receivedOn: string;
                            requester: string;
                            content: string;
                            location: string | null;
                            /** @enum {string} */
                            status: "RECEIVED" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
                            /** Format: date */
                            statusChangedOn: string;
                            /** Format: date */
                            resolvedOn: string | null;
                            linkCount: number;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                            history: {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                fromStatus: "RECEIVED" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
                                /** @enum {string} */
                                toStatus: "RECEIVED" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
                                /** Format: date */
                                effectiveOn: string;
                                note: string | null;
                                /** Format: date-time */
                                changedAt: string;
                            }[];
                            links: ({
                                /** @enum {string} */
                                kind: "WORK_LOG";
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                workLogId: string;
                                /** Format: date */
                                workDate: string;
                                content: string;
                                minutes: number;
                                /** Format: date-time */
                                linkedAt: string;
                            } | {
                                /** @enum {string} */
                                kind: "MATERIAL";
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                materialRecordId: string;
                                /** Format: date */
                                recordDate: string;
                                name: string;
                                spec: string | null;
                                unit: string;
                                /** @enum {string} */
                                recordKind: "RECEIVED" | "USED" | "RETURNED" | "DISCARDED";
                                quantity: number;
                                /** Format: date-time */
                                linkedAt: string;
                            })[];
                            usage: {
                                workLogCount: number;
                                minutes: number;
                                materials: {
                                    /** Format: uuid */
                                    materialId: string;
                                    name: string;
                                    spec: string | null;
                                    unit: string;
                                    quantity: number;
                                }[];
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
        trace?: never;
    };
    "/api/v1/repair-requests/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 보수 요청 상태 변경 (보류·완료 되돌리기는 사유 필수, 이력에 남음) */
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
                        toStatus: "RECEIVED" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
                        /** Format: date */
                        effectiveOn?: string;
                        note?: string | null;
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
                            seq: number;
                            /** Format: date */
                            receivedOn: string;
                            requester: string;
                            content: string;
                            location: string | null;
                            /** @enum {string} */
                            status: "RECEIVED" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
                            /** Format: date */
                            statusChangedOn: string;
                            /** Format: date */
                            resolvedOn: string | null;
                            linkCount: number;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                            history: {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                fromStatus: "RECEIVED" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
                                /** @enum {string} */
                                toStatus: "RECEIVED" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
                                /** Format: date */
                                effectiveOn: string;
                                note: string | null;
                                /** Format: date-time */
                                changedAt: string;
                            }[];
                            links: ({
                                /** @enum {string} */
                                kind: "WORK_LOG";
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                workLogId: string;
                                /** Format: date */
                                workDate: string;
                                content: string;
                                minutes: number;
                                /** Format: date-time */
                                linkedAt: string;
                            } | {
                                /** @enum {string} */
                                kind: "MATERIAL";
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                materialRecordId: string;
                                /** Format: date */
                                recordDate: string;
                                name: string;
                                spec: string | null;
                                unit: string;
                                /** @enum {string} */
                                recordKind: "RECEIVED" | "USED" | "RETURNED" | "DISCARDED";
                                quantity: number;
                                /** Format: date-time */
                                linkedAt: string;
                            })[];
                            usage: {
                                workLogCount: number;
                                minutes: number;
                                materials: {
                                    /** Format: uuid */
                                    materialId: string;
                                    name: string;
                                    spec: string | null;
                                    unit: string;
                                    quantity: number;
                                }[];
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
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/repair-requests/{id}/links": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 사후 작업 연결 (사후 작업으로 표시한 같은 프로젝트의 저장된 작업 내역 또는 자재 기록) */
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
                        workLogId?: string;
                        /** Format: uuid */
                        materialRecordId?: string;
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
                            seq: number;
                            /** Format: date */
                            receivedOn: string;
                            requester: string;
                            content: string;
                            location: string | null;
                            /** @enum {string} */
                            status: "RECEIVED" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
                            /** Format: date */
                            statusChangedOn: string;
                            /** Format: date */
                            resolvedOn: string | null;
                            linkCount: number;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                            history: {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                fromStatus: "RECEIVED" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
                                /** @enum {string} */
                                toStatus: "RECEIVED" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
                                /** Format: date */
                                effectiveOn: string;
                                note: string | null;
                                /** Format: date-time */
                                changedAt: string;
                            }[];
                            links: ({
                                /** @enum {string} */
                                kind: "WORK_LOG";
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                workLogId: string;
                                /** Format: date */
                                workDate: string;
                                content: string;
                                minutes: number;
                                /** Format: date-time */
                                linkedAt: string;
                            } | {
                                /** @enum {string} */
                                kind: "MATERIAL";
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                materialRecordId: string;
                                /** Format: date */
                                recordDate: string;
                                name: string;
                                spec: string | null;
                                unit: string;
                                /** @enum {string} */
                                recordKind: "RECEIVED" | "USED" | "RETURNED" | "DISCARDED";
                                quantity: number;
                                /** Format: date-time */
                                linkedAt: string;
                            })[];
                            usage: {
                                workLogCount: number;
                                minutes: number;
                                materials: {
                                    /** Format: uuid */
                                    materialId: string;
                                    name: string;
                                    spec: string | null;
                                    unit: string;
                                    quantity: number;
                                }[];
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
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/repair-requests/{id}/links/{linkId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** 사후 작업 연결 해제 (연결 기록은 남고 해제 시각만 기록) */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    linkId: string;
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
                            seq: number;
                            /** Format: date */
                            receivedOn: string;
                            requester: string;
                            content: string;
                            location: string | null;
                            /** @enum {string} */
                            status: "RECEIVED" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
                            /** Format: date */
                            statusChangedOn: string;
                            /** Format: date */
                            resolvedOn: string | null;
                            linkCount: number;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                            history: {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                fromStatus: "RECEIVED" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
                                /** @enum {string} */
                                toStatus: "RECEIVED" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
                                /** Format: date */
                                effectiveOn: string;
                                note: string | null;
                                /** Format: date-time */
                                changedAt: string;
                            }[];
                            links: ({
                                /** @enum {string} */
                                kind: "WORK_LOG";
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                workLogId: string;
                                /** Format: date */
                                workDate: string;
                                content: string;
                                minutes: number;
                                /** Format: date-time */
                                linkedAt: string;
                            } | {
                                /** @enum {string} */
                                kind: "MATERIAL";
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                materialRecordId: string;
                                /** Format: date */
                                recordDate: string;
                                name: string;
                                spec: string | null;
                                unit: string;
                                /** @enum {string} */
                                recordKind: "RECEIVED" | "USED" | "RETURNED" | "DISCARDED";
                                quantity: number;
                                /** Format: date-time */
                                linkedAt: string;
                            })[];
                            usage: {
                                workLogCount: number;
                                minutes: number;
                                materials: {
                                    /** Format: uuid */
                                    materialId: string;
                                    name: string;
                                    spec: string | null;
                                    unit: string;
                                    quantity: number;
                                }[];
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
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monthly-hours": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 월 공수표 (프로젝트 × 직원별 저장된 작업 내역 공수, 확정 상태·확정 당시 기준값·임시 저장 작업 내역·이력) */
        get: {
            parameters: {
                query: {
                    month: string;
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
                            month: string;
                            isClosed: boolean;
                            /** Format: date-time */
                            closedAt: string | null;
                            standardWorkMinutes: number;
                            monthlyWorkDays: number;
                            /** @enum {string} */
                            workUnitMode: "RATIO" | "HOURS";
                            draftLogCount: number;
                            drafts: {
                                /** Format: uuid */
                                projectId: string;
                                projectName: string;
                                /** Format: date */
                                workDate: string;
                            }[];
                            rows: {
                                /** Format: uuid */
                                projectId: string;
                                projectCode: string;
                                projectName: string;
                                /** Format: uuid */
                                employeeId: string;
                                employeeName: string;
                                minutes: number;
                            }[];
                            events: {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                kind: "CLOSED" | "REOPENED";
                                reason: string | null;
                                draftLogCount: number;
                                standardWorkMinutes: number;
                                monthlyWorkDays: number;
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
    "/api/v1/monthly-hours/close": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 월 공수 확정 (이번 달까지, 임시 저장 작업 내역이 남아 있으면 확인 필요, 확정 당시 기준값 고정, 이력에 남음) */
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
                        month: string;
                        confirmDrafts?: boolean;
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
                            month: string;
                            isClosed: boolean;
                            /** Format: date-time */
                            closedAt: string | null;
                            standardWorkMinutes: number;
                            monthlyWorkDays: number;
                            /** @enum {string} */
                            workUnitMode: "RATIO" | "HOURS";
                            draftLogCount: number;
                            drafts: {
                                /** Format: uuid */
                                projectId: string;
                                projectName: string;
                                /** Format: date */
                                workDate: string;
                            }[];
                            rows: {
                                /** Format: uuid */
                                projectId: string;
                                projectCode: string;
                                projectName: string;
                                /** Format: uuid */
                                employeeId: string;
                                employeeName: string;
                                minutes: number;
                            }[];
                            events: {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                kind: "CLOSED" | "REOPENED";
                                reason: string | null;
                                draftLogCount: number;
                                standardWorkMinutes: number;
                                monthlyWorkDays: number;
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
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monthly-hours/reopen": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 월 공수 재오픈 (사유 필수, 이력에 남음). 재오픈하면 그달의 작업 내역를 다시 고칠 수 있다 */
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
                        month: string;
                        reason: string;
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
                            month: string;
                            isClosed: boolean;
                            /** Format: date-time */
                            closedAt: string | null;
                            standardWorkMinutes: number;
                            monthlyWorkDays: number;
                            /** @enum {string} */
                            workUnitMode: "RATIO" | "HOURS";
                            draftLogCount: number;
                            drafts: {
                                /** Format: uuid */
                                projectId: string;
                                projectName: string;
                                /** Format: date */
                                workDate: string;
                            }[];
                            rows: {
                                /** Format: uuid */
                                projectId: string;
                                projectCode: string;
                                projectName: string;
                                /** Format: uuid */
                                employeeId: string;
                                employeeName: string;
                                minutes: number;
                            }[];
                            events: {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                kind: "CLOSED" | "REOPENED";
                                reason: string | null;
                                draftLogCount: number;
                                standardWorkMinutes: number;
                                monthlyWorkDays: number;
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
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/monthly-hours.xlsx": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 월 공수표 엑셀 내보내기 (급여·정산 담당에게 전달하는 용도, 내보낸 기록이 남음) */
        get: {
            parameters: {
                query: {
                    month: string;
                };
                header?: never;
                path?: never;
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
    "/api/v1/projects/{id}/transition-notices": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 상태 전환 전 확인할 것 (완료: 임시 저장 작업 내역·진행률·남은 자재·협의 중 변경 작업, 재개: 종료 예정일 경과). 막지 않고 알림 */
        get: {
            parameters: {
                query: {
                    to: "PLANNED" | "IN_PROGRESS" | "SUSPENDED" | "COMPLETED" | "WARRANTY" | "CLOSED" | "CANCELLED";
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
                            items: ({
                                /** @enum {string} */
                                type: "DRAFT_LOGS";
                                count: number;
                            } | {
                                /** @enum {string} */
                                type: "PROGRESS_BELOW_100";
                                percent: number | null;
                            } | {
                                /** @enum {string} */
                                type: "REMAINING_MATERIALS";
                                items: {
                                    /** Format: uuid */
                                    materialId: string;
                                    name: string;
                                    spec: string | null;
                                    unit: string;
                                    remaining: number;
                                }[];
                            } | {
                                /** @enum {string} */
                                type: "NEGOTIATING_CHANGES";
                                count: number;
                            } | {
                                /** @enum {string} */
                                type: "OPEN_REPAIRS";
                                count: number;
                            } | {
                                /** @enum {string} */
                                type: "HOLD_REPAIRS";
                                count: number;
                            } | {
                                /** @enum {string} */
                                type: "PERIOD_OVER";
                                /** Format: date */
                                plannedEnd: string;
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
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 프로젝트 요약 (완료 리포트: 기본정보·투입 공수·자재·변경 작업·대표 사진·자료, 금액·민감 문서 제외) */
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
                            /** Format: date */
                            generatedOn: string;
                            companyName: string;
                            project: {
                                /** Format: uuid */
                                id: string;
                                code: string;
                                name: string;
                                /** @enum {string} */
                                status: "PLANNED" | "IN_PROGRESS" | "SUSPENDED" | "COMPLETED" | "WARRANTY" | "CLOSED" | "CANCELLED";
                                siteName: string;
                                siteAddress: string | null;
                                clientName: string;
                                managerName: string;
                                /** Format: date */
                                contractDate: string;
                                /** Format: date */
                                plannedStart: string;
                                /** Format: date */
                                plannedEnd: string;
                                /** Format: date */
                                actualStart: string | null;
                                /** Format: date */
                                actualEnd: string | null;
                            };
                            progressPercent: number | null;
                            settings: {
                                /** @enum {string} */
                                workUnitMode: "RATIO" | "HOURS";
                                standardWorkMinutes: number;
                                monthlyWorkDays: number;
                            };
                            work: {
                                totalMinutes: number;
                                plannedMinutes: number | null;
                                workedDays: number;
                                savedLogCount: number;
                                byEmployee: {
                                    /** Format: uuid */
                                    employeeId: string;
                                    name: string;
                                    workedDays: number;
                                    minutes: number;
                                }[];
                                byCategory: {
                                    categoryName: string;
                                    minutes: number;
                                }[];
                            };
                            materials: {
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
                            changeWorks: {
                                items: {
                                    seq: number;
                                    /** Format: date */
                                    requestedOn: string;
                                    requester: string;
                                    content: string;
                                    /** @enum {string} */
                                    status: "NEGOTIATING" | "AGREED" | "WITHDRAWN";
                                }[];
                                minutes: number;
                                workLogCount: number;
                            };
                            afterService: {
                                minutes: number;
                                workLogCount: number;
                            };
                            photos: {
                                total: number;
                                items: {
                                    /** Format: uuid */
                                    id: string;
                                    /** @enum {string} */
                                    category: "BEFORE" | "DURING" | "AFTER" | "DEFECT" | "MATERIAL" | "SAFETY" | "OTHER";
                                    area: string | null;
                                    description: string | null;
                                    /** Format: date-time */
                                    takenAt: string;
                                    thumbnailUrl: string | null;
                                }[];
                            };
                            documents: {
                                sensitiveExcluded: number;
                                items: {
                                    /** Format: uuid */
                                    id: string;
                                    title: string;
                                    /** @enum {string} */
                                    category: "DRAWING" | "CONTRACT" | "SAFETY" | "QUOTE" | "OTHER";
                                    versionCount: number;
                                    /** Format: date */
                                    latestRevisionDate: string;
                                }[];
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
    "/api/v1/dashboard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 홈 대시보드 (오늘 투입·진행 프로젝트·위험·이번 주 인력·할 일과 켜 둔 알림) */
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
                            dashboard: {
                                /** Format: date */
                                today: string;
                                alerts: {
                                    key: string;
                                    urgent: boolean;
                                    alert: {
                                        /** @enum {string} */
                                        kind: "NO_LOG_TODAY";
                                        /** Format: uuid */
                                        projectId: string;
                                        projectName: string;
                                    } | {
                                        /** @enum {string} */
                                        kind: "BURN_REACHED";
                                        /** Format: uuid */
                                        projectId: string;
                                        projectName: string;
                                        /** @enum {string} */
                                        level: "WARN" | "LIMIT";
                                        burnPercent: number;
                                    } | {
                                        /** @enum {string} */
                                        kind: "BURN_AHEAD";
                                        /** Format: uuid */
                                        projectId: string;
                                        projectName: string;
                                        burnPercent: number;
                                        progressPercent: number;
                                    } | {
                                        /** @enum {string} */
                                        kind: "PROJECT_OVERDUE";
                                        /** Format: uuid */
                                        projectId: string;
                                        projectName: string;
                                        /** Format: date */
                                        plannedEnd: string;
                                        daysLate: number;
                                    } | {
                                        /** @enum {string} */
                                        kind: "DOUBLE_ASSIGNED";
                                        /** Format: uuid */
                                        employeeId: string;
                                        employeeName: string;
                                        dateCount: number;
                                        /** Format: date */
                                        firstDate: string;
                                        /** Format: date */
                                        lastDate: string;
                                        projectNames: string[];
                                    } | {
                                        /** @enum {string} */
                                        kind: "CHANGE_STALE";
                                        /** Format: uuid */
                                        projectId: string;
                                        projectName: string;
                                        /** Format: uuid */
                                        changeWorkId: string;
                                        seq: number;
                                        days: number;
                                    } | {
                                        /** @enum {string} */
                                        kind: "WARRANTY_ENDING";
                                        /** Format: uuid */
                                        projectId: string;
                                        projectName: string;
                                        /** Format: date */
                                        endOn: string;
                                        daysLeft: number;
                                    } | {
                                        /** @enum {string} */
                                        kind: "REPAIR_UNHANDLED";
                                        /** Format: uuid */
                                        projectId: string;
                                        projectName: string;
                                        /** Format: uuid */
                                        repairId: string;
                                        seq: number;
                                        days: number;
                                    } | {
                                        /** @enum {string} */
                                        kind: "CERTIFICATE_EXPIRING";
                                        /** Format: uuid */
                                        projectId: string;
                                        projectName: string;
                                        title: string;
                                        /** Format: date */
                                        expiresOn: string;
                                        daysLeft: number;
                                    } | {
                                        /** @enum {string} */
                                        kind: "CREDENTIAL_EXPIRING";
                                        /** Format: uuid */
                                        employeeId: string;
                                        employeeName: string;
                                        typeName: string;
                                        /** Format: date */
                                        expiresOn: string;
                                        daysLeft: number;
                                    } | {
                                        /** @enum {string} */
                                        kind: "MONTH_UNCLOSED";
                                        month: string;
                                    };
                                }[];
                                hiddenAlertCount: number;
                                stats: {
                                    inProgress: number;
                                    todayLoggedHeadcount: number;
                                    todayHeadcount: number;
                                    weekMinutes: number;
                                };
                                todayAssignments: {
                                    headcount: number;
                                    projects: {
                                        /** Format: uuid */
                                        projectId: string;
                                        code: string;
                                        name: string;
                                        headcount: number;
                                        hasLog: boolean;
                                    }[];
                                };
                                projectCounts: {
                                    planned: number;
                                    inProgress: number;
                                    suspended: number;
                                };
                                activeProjects: {
                                    /** Format: uuid */
                                    id: string;
                                    code: string;
                                    name: string;
                                    siteName: string;
                                    /** @enum {string} */
                                    status: "PLANNED" | "IN_PROGRESS" | "SUSPENDED" | "COMPLETED" | "WARRANTY" | "CLOSED" | "CANCELLED";
                                    /** Format: date */
                                    plannedEnd: string;
                                    hasLogToday: boolean;
                                    weekMinutes: number;
                                    progressPercent: number | null;
                                    burnPercent: number | null;
                                    warnings: ("BURN_WARN" | "BURN_LIMIT" | "BURN_AHEAD" | "OVERDUE" | "BEHIND_SCHEDULE")[];
                                }[];
                                risks: {
                                    /** Format: uuid */
                                    id: string;
                                    code: string;
                                    name: string;
                                    siteName: string;
                                    /** @enum {string} */
                                    status: "PLANNED" | "IN_PROGRESS" | "SUSPENDED" | "COMPLETED" | "WARRANTY" | "CLOSED" | "CANCELLED";
                                    /** Format: date */
                                    plannedEnd: string;
                                    hasLogToday: boolean;
                                    weekMinutes: number;
                                    progressPercent: number | null;
                                    burnPercent: number | null;
                                    warnings: ("BURN_WARN" | "BURN_LIMIT" | "BURN_AHEAD" | "OVERDUE" | "BEHIND_SCHEDULE")[];
                                }[];
                                week: {
                                    /** Format: date */
                                    from: string;
                                    /** Format: date */
                                    to: string;
                                    conflicts: {
                                        /** Format: uuid */
                                        employeeId: string;
                                        name: string;
                                        dateCount: number;
                                    }[];
                                    workingCount: number;
                                    idleCount: number;
                                };
                                todos: {
                                    draftLogCount: number;
                                    unclosedMonth: string | null;
                                };
                                warranty: {
                                    ending: {
                                        /** Format: uuid */
                                        projectId: string;
                                        code: string;
                                        name: string;
                                        /** Format: date */
                                        endOn: string;
                                        daysLeft: number;
                                    }[];
                                    openRepairCount: number;
                                };
                                expiring: {
                                    certificates: {
                                        /** Format: uuid */
                                        projectId: string;
                                        projectName: string;
                                        title: string;
                                        /** Format: date */
                                        expiresOn: string;
                                        daysLeft: number;
                                    }[];
                                    credentials: {
                                        /** Format: uuid */
                                        employeeId: string;
                                        employeeName: string;
                                        typeName: string;
                                        /** Format: date */
                                        expiresOn: string;
                                        daysLeft: number;
                                    }[];
                                };
                            };
                            settings: {
                                items: {
                                    /** @enum {string} */
                                    kind: "NO_LOG_TODAY" | "BURN_REACHED" | "BURN_AHEAD" | "PROJECT_OVERDUE" | "DOUBLE_ASSIGNED" | "CHANGE_STALE" | "WARRANTY_ENDING" | "REPAIR_UNHANDLED" | "CERTIFICATE_EXPIRING" | "CREDENTIAL_EXPIRING" | "MONTH_UNCLOSED";
                                    enabled: boolean;
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
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/company/alert-settings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 알림 종류별 켜짐 여부 (설정하지 않은 종류는 켜짐) */
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
                                /** @enum {string} */
                                kind: "NO_LOG_TODAY" | "BURN_REACHED" | "BURN_AHEAD" | "PROJECT_OVERDUE" | "DOUBLE_ASSIGNED" | "CHANGE_STALE" | "WARRANTY_ENDING" | "REPAIR_UNHANDLED" | "CERTIFICATE_EXPIRING" | "CREDENTIAL_EXPIRING" | "MONTH_UNCLOSED";
                                enabled: boolean;
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
        /** 알림 종류별 켜고 끄기 (보낸 종류만 바꿈) */
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
                        items: {
                            /** @enum {string} */
                            kind: "NO_LOG_TODAY" | "BURN_REACHED" | "BURN_AHEAD" | "PROJECT_OVERDUE" | "DOUBLE_ASSIGNED" | "CHANGE_STALE" | "WARRANTY_ENDING" | "REPAIR_UNHANDLED" | "CERTIFICATE_EXPIRING" | "CREDENTIAL_EXPIRING" | "MONTH_UNCLOSED";
                            enabled: boolean;
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
                            items: {
                                /** @enum {string} */
                                kind: "NO_LOG_TODAY" | "BURN_REACHED" | "BURN_AHEAD" | "PROJECT_OVERDUE" | "DOUBLE_ASSIGNED" | "CHANGE_STALE" | "WARRANTY_ENDING" | "REPAIR_UNHANDLED" | "CERTIFICATE_EXPIRING" | "CREDENTIAL_EXPIRING" | "MONTH_UNCLOSED";
                                enabled: boolean;
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
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/alerts/dismiss": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 알림 숨기기 (알림 키를 남겨 조건이 바뀌기 전까지 보이지 않게 함, 모두 숨기기도 같은 요청) */
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
                        keys: string[];
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
            };
        };
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
                        contentType: string;
                        size: number;
                        /** @enum {string} */
                        purpose: "PHOTO" | "DOCUMENT";
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
                                projectId: string | null;
                                /** Format: uuid */
                                employeeId: string | null;
                                /** @enum {string} */
                                purpose: "PHOTO" | "DOCUMENT" | "EMPLOYEE_DOCUMENT";
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
    "/api/v1/employees/{employeeId}/files": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 직원 서류 파일 업로드 신청 (이미지·PDF, 열람은 직원 서류 API로만) */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    employeeId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        name: string;
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
                                projectId: string | null;
                                /** Format: uuid */
                                employeeId: string | null;
                                /** @enum {string} */
                                purpose: "PHOTO" | "DOCUMENT" | "EMPLOYEE_DOCUMENT";
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
                            projectId: string | null;
                            /** Format: uuid */
                            employeeId: string | null;
                            /** @enum {string} */
                            purpose: "PHOTO" | "DOCUMENT" | "EMPLOYEE_DOCUMENT";
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
                            projectId: string | null;
                            /** Format: uuid */
                            employeeId: string | null;
                            /** @enum {string} */
                            purpose: "PHOTO" | "DOCUMENT" | "EMPLOYEE_DOCUMENT";
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
                                includeInSummary: boolean;
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
                            includeInSummary: boolean;
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
                            includeInSummary: boolean;
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
                        includeInSummary?: boolean;
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
                            includeInSummary: boolean;
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
                    memoDate?: string;
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
                                /** Format: date-time */
                                lastRecordedAt: string | null;
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
                            /** Format: date-time */
                            lastRecordedAt: string | null;
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
                            /** Format: date-time */
                            lastRecordedAt: string | null;
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
    "/api/v1/projects/{projectId}/ledger-entries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 프로젝트 지출·수입 내역 (날짜 최근순, 구분·분류·기간 필터, 커서 방식) */
        get: {
            parameters: {
                query?: {
                    kind?: "EXPENSE" | "INCOME";
                    categoryId?: string;
                    from?: string;
                    to?: string;
                    date?: string;
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
                                /** Format: date */
                                entryDate: string;
                                /** @enum {string} */
                                kind: "EXPENSE" | "INCOME";
                                /** Format: uuid */
                                categoryId: string | null;
                                amount: number;
                                /** Format: uuid */
                                partnerId: string | null;
                                content: string | null;
                                /** Format: uuid */
                                documentId: string | null;
                                /** Format: uuid */
                                changeWorkId: string | null;
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
        /** 지출·수입 기록 한 건 (구분마다 분류 목록이 다름, 증빙 문서·추가 공사 연결은 선택) */
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
                        /** Format: date */
                        entryDate: string;
                        /** @enum {string} */
                        kind: "EXPENSE" | "INCOME";
                        /** Format: uuid */
                        categoryId?: string;
                        amount: number;
                        /** Format: uuid */
                        partnerId?: string;
                        content?: string;
                        /** Format: uuid */
                        documentId?: string;
                        /** Format: uuid */
                        changeWorkId?: string;
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
                            /** Format: date */
                            entryDate: string;
                            /** @enum {string} */
                            kind: "EXPENSE" | "INCOME";
                            /** Format: uuid */
                            categoryId: string | null;
                            amount: number;
                            /** Format: uuid */
                            partnerId: string | null;
                            content: string | null;
                            /** Format: uuid */
                            documentId: string | null;
                            /** Format: uuid */
                            changeWorkId: string | null;
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
    "/api/v1/projects/{projectId}/ledger-summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 프로젝트 지출 합계·수입 합계·분류별 합계 (내역과 같은 필터) */
        get: {
            parameters: {
                query?: {
                    kind?: "EXPENSE" | "INCOME";
                    categoryId?: string;
                    from?: string;
                    to?: string;
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
                            expenseTotal: number;
                            incomeTotal: number;
                            entryCount: number;
                            byCategory: {
                                /** @enum {string} */
                                kind: "EXPENSE" | "INCOME";
                                /** Format: uuid */
                                categoryId: string | null;
                                amount: number;
                                count: number;
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
    "/api/v1/ledger-entries/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** 지출·수입 기록 삭제 (소프트 삭제) */
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
        /** 지출·수입 기록 수정 (구분을 바꾸면 분류도 새로 골라야 하며 안 고르면 비움) */
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
                        entryDate?: string;
                        /** @enum {string} */
                        kind?: "EXPENSE" | "INCOME";
                        /** Format: uuid */
                        categoryId?: string | null;
                        amount?: number;
                        /** Format: uuid */
                        partnerId?: string | null;
                        content?: string | null;
                        /** Format: uuid */
                        documentId?: string | null;
                        /** Format: uuid */
                        changeWorkId?: string | null;
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
                            entryDate: string;
                            /** @enum {string} */
                            kind: "EXPENSE" | "INCOME";
                            /** Format: uuid */
                            categoryId: string | null;
                            amount: number;
                            /** Format: uuid */
                            partnerId: string | null;
                            content: string | null;
                            /** Format: uuid */
                            documentId: string | null;
                            /** Format: uuid */
                            changeWorkId: string | null;
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
                    category?: "DRAWING" | "CONTRACT" | "SAFETY" | "QUOTE" | "OTHER";
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
                                category: "DRAWING" | "CONTRACT" | "SAFETY" | "QUOTE" | "OTHER";
                                title: string;
                                isSensitive: boolean;
                                isPinned: boolean;
                                includeInSummary: boolean;
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
        /** 올린 파일로 문서 만들기 (첫 버전, 계약·공문은 기본 민감 자료, 같은 파일로 다시 부르면 같은 문서) */
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
                        category?: "DRAWING" | "CONTRACT" | "SAFETY" | "QUOTE" | "OTHER";
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
                            category: "DRAWING" | "CONTRACT" | "SAFETY" | "QUOTE" | "OTHER";
                            title: string;
                            isSensitive: boolean;
                            isPinned: boolean;
                            includeInSummary: boolean;
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
                            category: "DRAWING" | "CONTRACT" | "SAFETY" | "QUOTE" | "OTHER";
                            title: string;
                            isSensitive: boolean;
                            isPinned: boolean;
                            includeInSummary: boolean;
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
                        category?: "DRAWING" | "CONTRACT" | "SAFETY" | "QUOTE" | "OTHER";
                        isSensitive?: boolean;
                        isPinned?: boolean;
                        includeInSummary?: boolean;
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
                            category: "DRAWING" | "CONTRACT" | "SAFETY" | "QUOTE" | "OTHER";
                            title: string;
                            isSensitive: boolean;
                            isPinned: boolean;
                            includeInSummary: boolean;
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
                            category: "DRAWING" | "CONTRACT" | "SAFETY" | "QUOTE" | "OTHER";
                            title: string;
                            isSensitive: boolean;
                            isPinned: boolean;
                            includeInSummary: boolean;
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
                                action: "DOCUMENT_VIEWED" | "DOCUMENT_DOWNLOADED" | "REPORT_EXPORTED" | "PAY_RATE_VIEWED" | "PAY_RATE_CHANGED" | "LABOR_COST_VIEWED" | "EMPLOYEE_DOCUMENT_VIEWED" | "MONTH_CLOSED" | "MONTH_REOPENED" | "WORK_LOG_SAVED" | "WORK_LOG_UPDATED" | "MATERIAL_RECORD_DELETED" | "LEDGER_ENTRY_DELETED" | "PHOTO_DELETED" | "DOCUMENT_DELETED" | "PROJECT_UPDATED" | "PROJECT_STATUS_CHANGED" | "EMPLOYEE_UPDATED";
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
        /** 통합 검색 (프로젝트·직원·메모·자료·작업 내역, 종류마다 최대 개수, projectId로 프로젝트 안에서만 검색) */
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
        /** 작업일보 한 장 (그날의 작업 내역·인원·공수·자재·사진, 인쇄·PDF용) */
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
        /** 작업일보 엑셀 내보내기 (기간 안의 작업 내역·공수·자재 시트, 내보낸 기록이 남음) */
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
