import { Document, Schema, Types, model } from 'mongoose';

export interface INotificationSubscription {
  userTelegramId: string;
  adId: Types.ObjectId;
  notifyOnPriceChange: boolean;
  notifyOnStatusChange: boolean;
}

export interface INotificationSubscriptionDocument
  extends INotificationSubscription,
    Document {}

const NotificationSubscriptionSchema = new Schema<INotificationSubscriptionDocument>({
  userTelegramId: { type: String, required: true },
  adId: { type: Schema.Types.ObjectId, ref: 'Ad', required: true },
  notifyOnPriceChange: { type: Boolean, default: true },
  notifyOnStatusChange: { type: Boolean, default: true },
});

NotificationSubscriptionSchema.index({ userTelegramId: 1, adId: 1 }, { unique: true });

const NotificationSubscription = model<INotificationSubscriptionDocument>(
  'NotificationSubscription',
  NotificationSubscriptionSchema
);

export default NotificationSubscription;
