import { Injectable, NotFoundException } from '@nestjs/common';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { InjectModel } from 'nestjs-typegoose';
import { UpdateMovieDto } from './update-movie.dto';
import { MovieModel } from './movie.model';
import { Types } from 'mongoose';
import { TelegramService } from 'src/telegram/telegram.service';

@Injectable()
export class MovieService {
  constructor(
    @InjectModel(MovieModel) private readonly MovieModel: ModelType<MovieModel>,
    private readonly TelegramService: TelegramService,
  ) {}

  async getAll(searchTerm?: string) {
    let options = {};

    if (searchTerm)
      options = {
        $or: [
          {
            title: new RegExp(searchTerm, 'i'),
          },
        ],
      };

    return this.MovieModel.find(options)
      .select('-updatedAt, -__v')
      .sort({ createdAt: 'desc' })
      .populate('actors genres')
      .exec();
  }

  async bySlug(slug: string) {
    const doc = await this.MovieModel.findOne({ slug })
      .populate('actors genres')
      .exec();

    if (!doc) throw new NotFoundException('Movie not found');

    return doc;
  }

  async byActor(actorId: Types.ObjectId) {
    const docs = await this.MovieModel.find({ actors: actorId }).exec();

    if (!docs) throw new NotFoundException('Movie not found');

    return docs;
  }

  async byGenres(genreIds: Types.ObjectId[]) {
    const docs = await this.MovieModel.find({ genres: { $in: genreIds } })
      .populate('actors genres')
      .exec();

    if (!docs) throw new NotFoundException('Movie not found');

    return docs;
  }

  async getMostPopular() {
    return this.MovieModel.find({ countOpened: { $gt: 0 } })
      .sort({ countOpened: -1 })
      .populate('genres')
      .exec();
  }

  async updateCountOpened(slug: string) {
    const updateDoc = await this.MovieModel.findOneAndUpdate(
      { slug },
      {
        $inc: { countOpened: 1 },
      },
      {
        new: true,
      },
    ).exec();

    if (!updateDoc) throw new NotFoundException('Movie not Found');

    return updateDoc;
  }

  async updateRating(id: Types.ObjectId, newRating: number) {
    return this.MovieModel.findByIdAndUpdate(
      id,
      {
        rating: newRating,
      },
      {
        new: true,
      },
    ).exec();
  }

  /**Admin place */
  async byId(_id: string) {
    const movie = await this.MovieModel.findById(_id);

    if (!movie) throw new NotFoundException('Movie not found');

    return movie;
  }

  async create() {
    const defaultValue: UpdateMovieDto = {
      bigPoster: '',
      actors: [],
      genres: [],
      poster: '',
      title: '',
      videoUrl: '',
      slug: '',
    };

    const movie = await this.MovieModel.create(defaultValue);

    return movie._id;
  }

  async update(_id: string, dto: UpdateMovieDto) {
    if (!dto.isSendTelegram) {
      await this.sendNotification(dto);
      dto.isSendTelegram = true;
    }
    const updateDoc = await this.MovieModel.findByIdAndUpdate(_id, dto, {
      new: true,
    }).exec();

    if (!updateDoc) throw new NotFoundException('Actor not Found');

    return updateDoc;
  }

  async delete(_id: string) {
    const deleteDoc = await this.MovieModel.findByIdAndDelete(_id).exec();

    if (!deleteDoc) throw new NotFoundException('Movie not Found');

    return deleteDoc;
  }

  async sendNotification(dto: UpdateMovieDto) {
    // if (process.env.NODE_ENV !== 'development')
    //   await this.TelegramService.sendPhoto(dto.poster);

    await this.TelegramService.sendPhoto(
      'https://fanart.tv/fanart/movies/245891/movieposter/john-wick-5cdaceaf4e0a7.jpg',
    );

    const msg = `<b>${dto.title}</b>`;

    await this.TelegramService.sendMessage(msg, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              url: 'https://okko.tv/movie/free-guy',
              text: 'Go to watch',
            },
          ],
        ],
      },
    });
  }
}
