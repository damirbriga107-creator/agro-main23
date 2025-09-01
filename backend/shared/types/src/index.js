// User and Authentication types
export var UserRole;
(function (UserRole) {
    UserRole["FARMER"] = "farmer";
    UserRole["ADVISOR"] = "advisor";
    UserRole["ADMIN"] = "admin";
    UserRole["SUPPORT"] = "support";
})(UserRole || (UserRole = {}));
export var FarmType;
(function (FarmType) {
    FarmType["CROP"] = "crop";
    FarmType["LIVESTOCK"] = "livestock";
    FarmType["MIXED"] = "mixed";
    FarmType["DAIRY"] = "dairy";
    FarmType["POULTRY"] = "poultry";
    FarmType["AQUACULTURE"] = "aquaculture";
})(FarmType || (FarmType = {}));
// Financial types
export var TransactionType;
(function (TransactionType) {
    TransactionType["INCOME"] = "income";
    TransactionType["EXPENSE"] = "expense";
})(TransactionType || (TransactionType = {}));
export var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "cash";
    PaymentMethod["CHECK"] = "check";
    PaymentMethod["BANK_TRANSFER"] = "bank_transfer";
    PaymentMethod["CREDIT_CARD"] = "credit_card";
    PaymentMethod["DIGITAL_PAYMENT"] = "digital_payment";
})(PaymentMethod || (PaymentMethod = {}));
export var BudgetStatus;
(function (BudgetStatus) {
    BudgetStatus["DRAFT"] = "draft";
    BudgetStatus["ACTIVE"] = "active";
    BudgetStatus["COMPLETED"] = "completed";
    BudgetStatus["CANCELLED"] = "cancelled";
})(BudgetStatus || (BudgetStatus = {}));
export var ApplicationStatus;
(function (ApplicationStatus) {
    ApplicationStatus["DRAFT"] = "draft";
    ApplicationStatus["SUBMITTED"] = "submitted";
    ApplicationStatus["UNDER_REVIEW"] = "under_review";
    ApplicationStatus["APPROVED"] = "approved";
    ApplicationStatus["DENIED"] = "denied";
    ApplicationStatus["PENDING_DOCUMENTS"] = "pending_documents";
})(ApplicationStatus || (ApplicationStatus = {}));
export var QuoteStatus;
(function (QuoteStatus) {
    QuoteStatus["PENDING"] = "pending";
    QuoteStatus["ACTIVE"] = "active";
    QuoteStatus["EXPIRED"] = "expired";
    QuoteStatus["ACCEPTED"] = "accepted";
    QuoteStatus["DECLINED"] = "declined";
})(QuoteStatus || (QuoteStatus = {}));
export var ClaimStatus;
(function (ClaimStatus) {
    ClaimStatus["SUBMITTED"] = "submitted";
    ClaimStatus["UNDER_REVIEW"] = "under_review";
    ClaimStatus["APPROVED"] = "approved";
    ClaimStatus["DENIED"] = "denied";
    ClaimStatus["PAID"] = "paid";
})(ClaimStatus || (ClaimStatus = {}));
export var NotificationType;
(function (NotificationType) {
    NotificationType["SYSTEM"] = "system";
    NotificationType["FINANCIAL"] = "financial";
    NotificationType["SUBSIDY"] = "subsidy";
    NotificationType["INSURANCE"] = "insurance";
    NotificationType["WEATHER"] = "weather";
    NotificationType["IOT"] = "iot";
})(NotificationType || (NotificationType = {}));
export var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority["LOW"] = "low";
    NotificationPriority["MEDIUM"] = "medium";
    NotificationPriority["HIGH"] = "high";
    NotificationPriority["URGENT"] = "urgent";
})(NotificationPriority || (NotificationPriority = {}));
export var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["EMAIL"] = "email";
    NotificationChannel["SMS"] = "sms";
    NotificationChannel["PUSH"] = "push";
    NotificationChannel["IN_APP"] = "in_app";
})(NotificationChannel || (NotificationChannel = {}));
//# sourceMappingURL=index.js.map