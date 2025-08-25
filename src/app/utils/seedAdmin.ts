import { Role } from "../modules/user/user.interface";
import { User } from "../modules/user/user.model";
import { hashedPassword } from "./hashedPassword";

export const seedAdmin = async () => {
    const adminExists = await User.findOne({ role: Role.ADMIN });
    if (adminExists) {
        console.log("Admin user already exists. Skipping seeding.");
        return;
    }
    const afterHashedPassword=await hashedPassword("Admin@123")
    const payload = {
        name: "Admin User",
        email: "admin@gmail.com",
        password: afterHashedPassword,
        role: Role.ADMIN,
        isVerified: true,
        contactNumber: "1234567890",
        auths: [{
            provider: 'credentials',
            providerId: "admin@gmail.com"
        }]
    };
    const adminUser = new User(payload);
    await adminUser.save();
    console.log("Admin user seeded successfully.");
}