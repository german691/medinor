import Joi from "joi";

export const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  fullName: Joi.string().min(2).max(30).required(),
  password: Joi.string().min(4).required(),
});

export const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});
