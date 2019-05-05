import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import { StringDecoder } from 'string_decoder';

function registerFileCommand(id: string, then: (name: string) => void)
{
	vscode.commands.registerCommand(id, function()
	{
		if(vscode.window.activeTextEditor !== undefined)
		{
			var doc = vscode.window.activeTextEditor.document;

			if(doc.languageId != "katana")
			{
				vscode.window.showErrorMessage("This file is not a Katana file (.k)");
				return;
			}

			then(doc.fileName);
		}
	});
}

function runProcess(cwd: string, command: string, channel: vscode.OutputChannel, then: (success: boolean) => void)
{
	var stderr = "";
	var stderrDecoder = new StringDecoder("utf-8");
	var stdoutDecoder = new StringDecoder("utf-8");

	var child = cp.spawn(command, {cwd: cwd, shell: true});
	child.stdin.end();
	child.stdout.on("data", function(data)
	{
		channel.append(stdoutDecoder.write(data));
	});
	child.stderr.on("data", function(data)
	{
		stderr += stderrDecoder.write(data);
	});
	child.on("exit", function(code)
	{
		stderr += stderrDecoder.end();

		channel.append(stdoutDecoder.end());
		channel.append(stderr);
		channel.appendLine(`Process exited with code ${code}.`);
		then(code == 0);
	});
}

function quickbuild(file: string)
{
	var cwd = path.dirname(file);
	var file = path.basename(file);
	var command = `katana quickbuild -Bm ${file}`;

	buildChannel.clear();
	buildChannel.appendLine("> " + command);
	buildChannel.show(true);

	runProcess(cwd, command, buildChannel, function(success)
	{
		if(success)
			vscode.window.showInformationMessage("Build successful.");
		else
			vscode.window.showErrorMessage("Build failed.");
	});
}

var buildChannel : vscode.OutputChannel = null;

export
function activate(context: vscode.ExtensionContext)
{
	buildChannel = vscode.window.createOutputChannel("Katana-Build");
	registerFileCommand("katana.quickbuild", quickbuild);
}

export
function deactivate()
{
	if(buildChannel != null)
		buildChannel.dispose();
}
