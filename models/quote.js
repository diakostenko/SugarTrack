import { Schema, model } from 'mongoose';

const quoteSchema = new Schema({
    quote: { type: String, required: true },
    autor: { type: String, required: true }
});

export const Quote = model('Quote', quoteSchema);

