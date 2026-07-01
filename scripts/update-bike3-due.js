const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// Load .env.local
const envPath = path.join(__dirname, "..", ".env.local");
const content = fs.readFileSync(envPath, "utf8");

content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const eq = trimmed.indexOf("=");
    if (eq === -1) return;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        value = value.slice(1, -1);
    }

    process.env[key] = value;
});

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);

    const Bike = mongoose.model(
        "Bike",
        new mongoose.Schema({}, { strict: false }),
        "bikes"
    );

    const DriverDue = mongoose.model(
        "DriverDue",
        new mongoose.Schema({}, { strict: false }),
        "driverdues"
    );

    const bike = await Bike.findOne({ name: "Bike 3" });

    if (!bike) {
        console.log("❌ Bike 3 not found");
        process.exit(1);
    }

    await DriverDue.updateOne(
        { bikeId: bike._id },
        {
            $set: {
                balance: 0,
                updatedAt: new Date(),
            },
        }
    );

    console.log("✅ Bike 3 due updated to 0");

    await mongoose.disconnect();
}

main().catch(console.error);