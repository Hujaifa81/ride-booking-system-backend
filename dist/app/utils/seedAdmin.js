"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAdmin = void 0;
const user_interface_1 = require("../modules/user/user.interface");
const user_model_1 = require("../modules/user/user.model");
const hashedPassword_1 = require("./hashedPassword");
const seedAdmin = () => __awaiter(void 0, void 0, void 0, function* () {
    const adminExists = yield user_model_1.User.findOne({ role: user_interface_1.Role.ADMIN });
    if (adminExists) {
        console.log("Admin user already exists. Skipping seeding.");
        return;
    }
    const afterHashedPassword = yield (0, hashedPassword_1.hashedPassword)("Admin@123");
    const payload = {
        name: "Admin User",
        email: "admin@gmail.com",
        password: afterHashedPassword,
        role: user_interface_1.Role.ADMIN,
        isVerified: true,
        contactNumber: "1234567890",
        auths: [{
                provider: 'credentials',
                providerId: "admin@gmail.com"
            }]
    };
    const adminUser = new user_model_1.User(payload);
    yield adminUser.save();
    console.log("Admin user seeded successfully.");
});
exports.seedAdmin = seedAdmin;
