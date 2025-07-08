import { Admin } from "../domains/private/admin/admin.model.js";

export const initAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ userType: "admin" });
    if (adminExists) {
      return;
    } else {
      console.log("Se inicializa administrador por defecto");
    }

    const { DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD } = process.env;
    const username = DEFAULT_ADMIN_USERNAME || "admin";
    const password = DEFAULT_ADMIN_PASSWORD || "admin";

    const hashedPassword = await hashData(password);

    const adminObj = {
      username,
      password: hashedPassword,
      fullName: "admin",
      userType: "admin",
    };

    await Admin.create(adminObj);

    console.log(
      `Admin created successfully with credentials username: '${username}' and password: '${password}'`
    );
  } catch (error) {
    console.error("Error creating admin:", error);
  }
};
