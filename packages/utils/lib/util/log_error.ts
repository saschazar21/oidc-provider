export interface ErrorLog {
  method: string;
  path: string;
  statusCode: number;
  message: string;
}

const logError = (error: ErrorLog): void => {
  const msg = `
---------------------------------------------------
${error.method}  ${error.path}  ${error.statusCode}
---------------------------------------------------

${error.message}
  `;

  console.error(msg);
};

export default logError;
