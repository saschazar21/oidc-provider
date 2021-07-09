export interface ErrorLog {
  id?: string;
  method: string;
  path: string;
  statusCode: number;
  message: string;
}

const logError = (error: ErrorLog): void => {
  const msg = `\n\n
                   ID: ${error.id ?? '<None>'}
---------------------------------------------------
${error.method}  ${error.path}  ${error.statusCode}
---------------------------------------------------

${error.message}\n\n
  `;

  console.error(msg);
};

export default logError;
