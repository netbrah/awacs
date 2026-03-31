#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from './config/loader.js';
import { KillChainRunner } from './kill-chain/runner.js';
import { ArtifactStore } from './artifacts/store.js';
import { SortieState } from './state/sortie.js';
import { setLogLevel } from './utils/logger.js';
import type { PhaseName } from './kill-chain/types.js';

const program = new Command();

program
  .name('awacs')
  .description('Adversarial Weighted Analysis with Cross-Synthesis — multi-model adversarial orchestration for ONTAP code sorties')
  .version('0.1.0');

program
  .command('sortie <ticket-id>')
  .description('Run a full AWACS sortie for an ONTAP ticket')
  .option('--blue <model>', 'Blue team model ID')
  .option('--red <model>', 'Red team model ID')
  .option('--arbiter <model>', 'Arbiter model ID')
  .option('--phase <phase>', 'Run only a specific phase (rca, unit_test_plan, functional_test_plan)')
  .option('--resume', 'Resume from last completed phase')
  .option('--single', 'Skip AWACS, run single-model only')
  .option('--verbose', 'Enable debug logging')
  .action(async (ticketId: string, opts: {
    blue?: string;
    red?: string;
    arbiter?: string;
    phase?: string;
    resume?: boolean;
    single?: boolean;
    verbose?: boolean;
  }) => {
    if (opts.verbose) {
      setLogLevel('debug');
    }

    try {
      const config = await loadConfig({
        blue: opts.blue,
        red: opts.red,
        arbiter: opts.arbiter,
      });

      const runner = new KillChainRunner(config);
      await runner.runSortie(ticketId, `Investigate and resolve ${ticketId}`, {
        phase: opts.phase as PhaseName | undefined,
        resume: opts.resume,
        single: opts.single,
      });
    } catch (err) {
      console.error(chalk.red(`\nError: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

program
  .command('status <ticket-id>')
  .description('Show sortie status')
  .action(async (ticketId: string) => {
    try {
      const config = await loadConfig();
      const state = new SortieState(ticketId, config.artifacts.baseDir);
      await state.load();
      const s = state.getState();

      console.log(chalk.bold(`\nSortie: ${s.ticketId}`));
      console.log(chalk.dim(`Created: ${s.createdAt}`));
      console.log(chalk.dim(`Blue: ${s.models.blue} | Red: ${s.models.red} | Arbiter: ${s.models.arbiter}\n`));

      const statusIcon: Record<string, string> = {
        pending: chalk.gray('○'),
        dispatched: chalk.yellow('◐'),
        critiquing: chalk.yellow('◑'),
        synthesizing: chalk.yellow('◕'),
        complete: chalk.green('●'),
        failed: chalk.red('✗'),
        skipped: chalk.dim('⊘'),
        pending_manual: chalk.blue('◇'),
      };

      for (const [phase, status] of Object.entries(s.phases)) {
        const icon = statusIcon[status] ?? chalk.gray('?');
        console.log(`  ${icon} ${phase.padEnd(25)} ${status}`);
      }
      console.log();
    } catch (err) {
      console.error(chalk.red(`No sortie found for ${ticketId}`));
      process.exit(1);
    }
  });

program
  .command('artifacts <ticket-id>')
  .description('List sortie artifacts')
  .action(async (ticketId: string) => {
    try {
      const config = await loadConfig();
      const store = new ArtifactStore(config.artifacts.baseDir);
      const artifacts = await store.listArtifacts(ticketId);

      if (artifacts.length === 0) {
        console.log(chalk.yellow(`No artifacts found for ${ticketId}`));
        return;
      }

      console.log(chalk.bold(`\nArtifacts for ${ticketId}:`));
      console.log(chalk.dim(`Directory: ${store.getSortieDir(ticketId)}\n`));
      for (const a of artifacts) {
        console.log(`  ${chalk.cyan('•')} ${a}`);
      }
      console.log();
    } catch (err) {
      console.error(chalk.red(`Error listing artifacts: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

program.parse();
