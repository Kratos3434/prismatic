-- CreateTable
CREATE TABLE "TemporaryUser" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "gender" VARCHAR(1) NOT NULL,
    "password" TEXT NOT NULL,
    "retrieveToken" TEXT NOT NULL,

    CONSTRAINT "TemporaryUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryUser_email_key" ON "TemporaryUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryUser_retrieveToken_key" ON "TemporaryUser"("retrieveToken");
