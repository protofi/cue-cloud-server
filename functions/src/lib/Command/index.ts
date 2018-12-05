import ModelImpl from "./../ORM/Models";

export default interface IActionableFieldCommand {
    execute(owner: ModelImpl, field: any): Promise<void>
    undo(): Promise<void>
}