import Joi from "joi";

export const userRegistrationJoiSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  password: Joi.string().min(8).required(),
});

export const userAuthJoiSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  password: Joi.string().min(8).required(),
});

export const userMessageSchema = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().min(3).max(30),
  tel: Joi.string().min(3).max(30),
  topic: Joi.string().min(3).max(30).required(),
  message: Joi.string().min(3).max(1024).required(),
});

export const userAditionalInfoJoiSchema = Joi.object({
  info: Joi.object({
    client: Joi.object({
      code: Joi.string().required(),
      registration_date: Joi.date().required(),
      trade_name: Joi.string().required(),
      corporate_name: Joi.string().required(),
      business_type: Joi.string().required(),
      location: Joi.string().required(),
    }).required(),
    owner: Joi.object({
      full_name: Joi.string().required(),
      personal_address: Joi.string().required(),
      email: Joi.string().email().required(),
      tax_id: Joi.string().required(),
      location: Joi.string().required(),
      phone: Joi.string().required(),
    }).required(),
    technical_director: Joi.object().optional(),
    purchase_manager: Joi.object().optional(),
    business_data: Joi.object({
      business_address: Joi.string().required(),
      legal_address: Joi.string().required(),
      postal_code: Joi.string().required(),
      location: Joi.string().required(),
      email: Joi.string().email().required(),
      tax_registration_number: Joi.string().required(),
      phone: Joi.string().required(),
      vat_condition: Joi.string().required(),
    }).required(),
    business_references: Joi.array().items(Joi.string()).optional(),
    documents: Joi.object().optional(),
  }).required(),
});
