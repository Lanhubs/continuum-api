
import FormData from 'form-data';
import axios from 'axios';

export class RaveService {
  private static readonly RAVE_URL = process.env.RAVE_MICROSERVICE_URL || 'http://localhost:8000';

  /**
   * Sends a radiology scan to the RAVE microservice for clinical preprocessing and interpretation.
   */
  static async analyzeRadiology(buffer: Buffer, mimeType: string, type: string = 'RADIOLOGY') {
    const formData = new FormData();
    formData.append('file', buffer, { filename: 'scan.jpg', contentType: mimeType });
    formData.append('type', type);

    try {
      const response = await axios.post(`${this.RAVE_URL}/analyze`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      return response.data;
    } catch (error) {
      console.error('RAVE Microservice Error:', error);
      throw new Error('Radiology analysis microservice failed.');
    }
  }
}
