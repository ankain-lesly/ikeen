import { testDateFormatting } from "./date";

// Standard reference: September 18, 2026, 09:30 AM
const standardReference = new Date(2026, 8, 18, 9, 30);

testDateFormatting(standardReference);
