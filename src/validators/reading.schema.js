const { z } = require('zod');
const { todayStr } = require('../utils/dates');

const SLOTS = ['morning_fasting', 'after_breakfast', 'after_lunch', 'after_dinner'];
const SLOT_LABELS = {
  morning_fasting: 'Morning (fasting)', after_breakfast: 'After breakfast',
  after_lunch: 'After lunch', after_dinner: 'After dinner',
};
const RANGE_MSG = 'Value must be between 40 and 600 mg/dl.';

const readingSchema = z.object({
  date: z.string({ required_error: 'Please select a date.' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date.')
    .refine(d => d <= todayStr(), 'Date cannot be in the future.'),
  slot: z.enum(SLOTS, { errorMap: () => ({ message: 'Please choose a time slot.' }) }),
  value: z.preprocess(
    v => (v === '' || v == null ? undefined : Number(v)),
   z.number({ error: 'Please enter a glucose value.' })
      .int(RANGE_MSG).min(40, RANGE_MSG).max(600, RANGE_MSG)
  ),
});
module.exports = { readingSchema, SLOTS, SLOT_LABELS };