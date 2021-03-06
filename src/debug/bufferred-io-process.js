import ChildProcess from 'child_process';

export default class BufferedIOProcess {
    constructor(arg) {
        this.command = arg.command;
        this.args = arg.args;
        this.env = arg.env;
        let emptyFunc = () => {};
        this.stdout = arg.stdout || emptyFunc;
        this.stderr = arg.stderr|| emptyFunc;

        this.emitLine = (inputLine) => {
            if (!this.process) {
                throw new Error('Process is not started.');
            }
            this.process.stdin.write(inputLine + '\r\n');

        };
        this.exit = arg.exit || emptyFunc;
        this.partialLine = {err: '', out: ''};

    }
    spawn() {
        return new Promise((resolve, reject) => {
            console.log([this.command, ...this.args].join(' '));
            this.process = ChildProcess.spawn(this.command, this.args, {env: this.env});
            this.process.stdin.setEncoding = 'utf-8';
            this.process.stderr.on('data', (data) => {
                return this._stdio(data, 'err');
            });
            this.process.stdout.on('data', (data) => {
                return this._stdio(data, 'out');
            });


            let error, ok = () => {
                this.process.removeListener('error', error);
                return resolve(this);
            };

            error = (err) => {
                this.process.removeListener('data', ok);
                return reject(err);
            };
            this.process.stderr.once('data', ok);
            this.process.stdout.once('data', ok);
            this.process.once('error', error);
            this.exitPromise = new Promise(exitResolve => {
                this.process.on('exit', (code) => {
                    exitResolve(code);
                    this.exit(code);
                });
            });

        });
    }

    stdin(line) {
        return this.process.stdin.write(line + '\n');
    }

    kill(signal) {
        this.process.kill(signal);
        return this.exitPromise;
    }

    _stdio(data, channel) {
        let i, len, line, lines;
        data = this.partialLine[channel] + data.toString();
        lines = data.replace(/(\r|\n)+/g, '\n').split('\n');
        this.partialLine[channel] = lines.slice(-1);
        lines = lines.slice(0, -1);
        for (i = 0, len = lines.length; i < len; i++) {
            line = lines[i];
            channel === 'err' ? this.stderr(line) : this.stdout(line);
        }
    };
}