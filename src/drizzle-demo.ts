import { eq } from "drizzle-orm";
import { index } from "./db";
import { demoUsers } from "./db/schema";

async function main() {
  console.log("Performing CRUD operations...");

  const [newUser] = await index
    .insert(demoUsers)
    .values({ name: "Admin User", email: "admin@example.com" })
    .returning();

  if (!newUser) {
    console.error("Failed to create user");
    process.exit(1);
  }

  console.log("CREATE: New user created:", newUser);

  const foundUser = await index
    .select()
    .from(demoUsers)
    .where(eq(demoUsers.id, newUser.id));
  console.log("READ: Found user:", foundUser[0]);

  const [updatedUser] = await index
    .update(demoUsers)
    .set({ name: "Super Admin" })
    .where(eq(demoUsers.id, newUser.id))
    .returning();

  if (!updatedUser) {
    console.error("Failed to update user");
    process.exit(1);
  }

  console.log("UPDATE: User updated:", updatedUser);

  await index.delete(demoUsers).where(eq(demoUsers.id, newUser.id));
  console.log("DELETE: User deleted.");

  console.log("CRUD operations completed successfully.");
}

void main();
