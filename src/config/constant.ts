export const URL_ECR_MADARA_DOCKER="https://gallery.ecr.aws/o5q6k5w4/madara"
export const URL_MADARA="https://gallery.ecr.aws/o5q6k5w4/madara"

export const MADARA_CONFIG_DEPLOYMENT= {
    // URL:"https://gallery.ecr.aws/o5q6k5w4/madara",
    URL:"ghcr.io/keep-starknet-strange/madara",
    TAG:"v0.1.0-beta",
    config: {
        MIN_CONFIG: {
            storage: 8,
            customSpecs: {
              cpu: 2,
              memory: 4,
            },
        },
   
    }
}
export interface ChainInterface {
    chainId:string;
    url:string;
    blockExplorer:string;
}

export enum ComputeTypeEnum {
    SPOT = "spot",
    DEMAND = "demand"
}

export enum ErrorMessage {
    SPHERON_ISSUE = "SPHERON_ISSUE",
    SPHERON_INSTANCE_ALREADY_CLOSE= "SPHERON_INSTANCE_ALREADY_CLOSE",
    UNAUTHORIZED_SPHERON= "UNAUTHORIZED_SPHERON",
    SPHERON_CAST_ID_ERROR = "SPHERON_CAST_ID_ERROR",
    API_KEY_EXPIRED = "API_KEY_EXPIRED",
    DEMAND = "demand"
}