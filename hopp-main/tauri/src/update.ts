import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export async function checkForUpdates() {
    const update = await check();
    if (update) {
        console.debug(
            `found update ${update.version} from ${update.date} with notes ${update.body}`
        )
    }
    return update;
}

export async function downloadAndRelaunch() {
    const update = await check();
    if (update) {
        let downloaded = 0;
        let contentLength: number | undefined = 0;
        // alternatively we could also call update.download() and update.install() separately
        await update.downloadAndInstall((event) => {
            switch (event.event) {
                case 'Started':
                    contentLength = event.data.contentLength;
                    console.debug(`started downloading ${event.data.contentLength} bytes`);
                    break;
                case 'Progress':
                    downloaded += event.data.chunkLength;
                    console.debug(`downloaded ${downloaded} from ${contentLength}`);
                    break;
                case 'Finished':
                    console.debug('download finished');
                    break;
            }
        });

        console.debug('update installed');
        await relaunch();
    }
}