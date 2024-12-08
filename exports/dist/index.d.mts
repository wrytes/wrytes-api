declare class SubscriptionGroups {
    constructor();
    groups: string[];
}

type TelegramState = {
    startup: number;
};
type TelegramGroupState = {
    apiVersion: string;
    createdAt: number;
    updatedAt: number;
    groups: string[];
    ignore: string[];
    subscription: {
        [key: string]: SubscriptionGroups;
    };
};

export type { TelegramGroupState, TelegramState };
