import ModelImpl from "../ORM/Models";
import { getStatusText, NOT_IMPLEMENTED } from 'http-status-codes'

export interface IActionableFieldCommand {
    execute(owner: ModelImpl, change: any, after?: any, before?: any): Promise<void>
    undo(owner: ModelImpl): Promise<void>
}

export abstract class AbstractActionableFieldCommand {
    abstract execute(owner: ModelImpl, change: any, after?: any, before?: any): Promise<void>

    undo(owner: ModelImpl): Promise<void> {
        throw new Error(getStatusText(NOT_IMPLEMENTED))
    }
}

export interface IModelCommand{
    execute(owner: ModelImpl): Promise<void>
    undo(owner: ModelImpl): Promise<void>
}

export abstract class AbstractModelCommand implements IModelCommand{

    abstract execute(owner: ModelImpl): Promise<void>

    undo(owner: ModelImpl): Promise<void> {
        throw new Error(getStatusText(NOT_IMPLEMENTED))
    }
}