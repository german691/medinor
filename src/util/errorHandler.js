export const handleError = (message, status) => {
  const error = new Error(message);
  error.status = status || 500;
  console.log(error);
  throw error;
};
