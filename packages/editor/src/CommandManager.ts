/**
 * Single / chained / dry-run command execution.
 *
 * - `editor.commands.foo()` runs one command over a fresh transaction and
 *   dispatches immediately.
 * - `chain()` shares ONE transaction across every link; a failing link does not
 *   abort the chain, and `run()` dispatches once and reports `every(true)`.
 * - `can()` passes `dispatch: undefined`, so commands report feasibility
 *   without touching the draft. `can().chain()` never dispatches.
 */

import type { Editor } from "./Editor.js";
import type {
  CanCommands,
  ChainedCommands,
  CommandProps,
  EditorStateLike,
  RawCommands,
  SingleCommands,
  Transaction,
} from "./types.js";

function chainableState(tr: Transaction): EditorStateLike {
  return {
    get doc() {
      return tr.doc;
    },
    get selection() {
      return tr.selection;
    },
    get storedMarks() {
      return tr.storedMarks;
    },
  };
}

export class CommandManager {
  constructor(private readonly editor: Editor) {}

  private get rawCommands(): RawCommands {
    return this.editor.extensionManager.commands;
  }

  get commands(): SingleCommands {
    const tr = this.editor.createTransaction();
    const props = this.buildProps(tr);
    const entries = Object.entries(this.rawCommands).map(([name, command]) => {
      const method = (...args: never[]) => {
        const result = command(...args)(props);
        if (!tr.getMeta("preventDispatch")) {
          this.editor.dispatch(tr);
        }
        return result;
      };
      return [name, method];
    });
    return Object.fromEntries(entries) as unknown as SingleCommands;
  }

  chain(): ChainedCommands {
    return this.createChain();
  }

  can(): CanCommands {
    return this.createCan();
  }

  createChain(startTr?: Transaction, shouldDispatch = true): ChainedCommands {
    const results: boolean[] = [];
    const hasStartTransaction = !!startTr;
    const tr = startTr ?? this.editor.createTransaction();

    const run = () => {
      if (
        !hasStartTransaction &&
        shouldDispatch &&
        !tr.getMeta("preventDispatch")
      ) {
        this.editor.dispatch(tr);
      }
      return results.every((result) => result === true);
    };

    const chain = {
      ...Object.fromEntries(
        Object.entries(this.rawCommands).map(([name, command]) => {
          const link = (...args: never[]) => {
            results.push(command(...args)(this.buildProps(tr, shouldDispatch)));
            return chain;
          };
          return [name, link];
        }),
      ),
      run,
    } as unknown as ChainedCommands;

    return chain;
  }

  createCan(startTr?: Transaction): CanCommands {
    const tr = startTr ?? this.editor.createTransaction();
    const props = this.buildProps(tr, false);
    const entries = Object.entries(this.rawCommands).map(([name, command]) => [
      name,
      (...args: never[]) => command(...args)({ ...props, dispatch: undefined }),
    ]);
    return {
      ...Object.fromEntries(entries),
      chain: () => this.createChain(tr, false),
    } as unknown as CanCommands;
  }

  buildProps(tr: Transaction, shouldDispatch = true): CommandProps {
    const manager = this;
    const props: CommandProps = {
      tr,
      editor: this.editor,
      state: chainableState(tr),
      dispatch: shouldDispatch ? () => undefined : undefined,
      chain: () => manager.createChain(tr, shouldDispatch),
      can: () => manager.createCan(tr),
      get commands() {
        const entries = Object.entries(manager.rawCommands).map(
          ([name, command]) => [
            name,
            (...args: never[]) => command(...args)(props),
          ],
        );
        return Object.fromEntries(entries) as unknown as SingleCommands;
      },
    };
    return props;
  }
}
