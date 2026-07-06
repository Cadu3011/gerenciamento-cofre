import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { CronJobs, Jobs } from '@prisma/client';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class JobsGateway {
  @WebSocketServer()
  server: Server;

  emitJob(job: Jobs & { cronJobs: CronJobs[] }) {
    this.server.emit('job-status', job);
  }
}
