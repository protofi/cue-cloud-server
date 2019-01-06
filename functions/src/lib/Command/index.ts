import ModelImpl from "../ORM/Models";

export interface IActionableFieldCommand {
    execute(owner: ModelImpl, change: any, after?: any, before?: any): Promise<void>
    undo(owner: ModelImpl): Promise<void>
}

export interface IModelCommand{
    execute(owner: ModelImpl): Promise<void>
    undo(owner: ModelImpl): Promise<void>
}