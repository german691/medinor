export default function handleError(message, statusCode, extraFields = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, extraFields);
  throw error;
}
