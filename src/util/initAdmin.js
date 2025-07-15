import { Admin } from "../domains/private/admin/admin.model.js";
import { Roles } from "../domains/roles.js";
import { hashData } from "./hashData.js";

export const initAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ role: Roles.ADMIN });
    if (adminExists) {
      return;
    } else {
      console.log("Se inicializa administrador por defecto");
    }

    const { DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD } = process.env;
    const username = DEFAULT_ADMIN_USERNAME || Roles.ADMIN;
    const password = DEFAULT_ADMIN_PASSWORD || Roles.ADMIN;

    const hashedPassword = await hashData(password);

    const adminObj = {
      username,
      password: hashedPassword,
      fullName: Roles.ADMIN,
      role: Roles.ADMIN,
    };

    await Admin.create(adminObj);

    console.log(
      `Admin created successfully with credentials username: '${username}' and password: '${password}'`
    );
  } catch (error) {
    console.error("Error creating admin:", error);
  }
};
