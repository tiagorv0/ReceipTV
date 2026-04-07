declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: string;
    DATABASE_URL: string;
    JWT_SECRET: string;
    GROQ_API_KEY?: string;
    NODE_ENV?: 'development' | 'production';
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_USER?: string;
    SMTP_PASS?: string;
    SMTP_FROM?: string;
  }
}
