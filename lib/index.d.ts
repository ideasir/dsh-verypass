export declare const inject: string[];
interface SecretEntry {
    name: string;
    project: string;
    variable: string;
    prefix: string;
    value: string;
    note: string;
    createdAt: string;
}
interface VaultData {
    enabled: boolean;
    secrets: SecretEntry[];
}
declare function loadData(): Promise<VaultData>;
export declare function apply(ctx: any, config?: any): {
    scope: any;
    loadData: typeof loadData;
};
export {};
