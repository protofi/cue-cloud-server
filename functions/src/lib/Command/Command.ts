import ModelImpl from "./../ORM/Models";

export default interface IActionableFieldCommand {
    execute(owner: ModelImpl, field: string): Promise<void>
    undo(): Promise<void>
}