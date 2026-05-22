import { Schema, model } from 'mongoose';

const hbA1cRecordSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    value: {
        type: Number,
        required: true,
        min: 3,
        max: 20
    },
    date: {
        type: Date,
        required: true
    },
    note: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

hbA1cRecordSchema.index({ userId: 1, date: -1 });

export const HbA1cRecord = model('HbA1cRecord', hbA1cRecordSchema);