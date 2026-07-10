import { IPollFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from "n8n-workflow";
export declare class ZenaTrigger implements INodeType {
    description: INodeTypeDescription;
    poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null>;
}
