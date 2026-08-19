import { ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let mockRequest: { method: string; originalUrl: string; id?: string };
  let host: ArgumentsHost;

  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRequest = { method: 'GET', originalUrl: '/api/v1/widgets', id: 'req-123' };

    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('formats a thrown HttpException using its own status and message', () => {
    filter.catch(new NotFoundException('Widget not found'), host);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Widget not found',
        error: 'Not Found',
        path: '/api/v1/widgets',
        requestId: 'req-123',
      }),
    );
  });

  it('preserves a validation-pipe-style array message', () => {
    filter.catch(new BadRequestException(['name should not be empty']), host);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: ['name should not be empty'] }),
    );
  });

  it('masks an unknown error message in production', () => {
    process.env.NODE_ENV = 'production';

    filter.catch(new Error('database password is wrong'), host);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, message: 'Internal server error' }),
    );
  });

  it('includes the real error message outside production', () => {
    process.env.NODE_ENV = 'development';

    filter.catch(new Error('something specific broke'), host);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'something specific broke' }),
    );
  });

  it('always includes a path and an ISO timestamp', () => {
    filter.catch(new NotFoundException(), host);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/v1/widgets',
        // @types/jest declares stringMatching's return as `any` (it's an
        // asymmetric matcher, not a real string), so embedding it directly
        // as an object-literal property value is flagged as an unsafe
        // assignment. It genuinely stands in for a string here — assert
        // that once, at this boundary, rather than widening the property.
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/) as string,
      }),
    );
  });
});
