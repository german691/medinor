export const handleStatus = async (req, res) => {
  res.status(200).json({ status: "success", message: "Medinor api active" });
};

export const endpointNotFound = (req, res) => {
  res.status(404).json({
    message: "Endpoint not found, perhaps you're using the wrong method?",
    url: req.protocol + "://" + req.get("host") + req.originalUrl,
    body: req.body,
    params: req.params,
    method: req.method,
  });
};
