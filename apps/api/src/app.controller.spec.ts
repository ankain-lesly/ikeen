import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(() => {
    appController = new AppController(new AppService());
  });

  describe('root', () => {
    it('should return welcome HTML', () => {
      expect(appController.getHello()).toContain('Welcome to ikeen');
    });
  });
});
