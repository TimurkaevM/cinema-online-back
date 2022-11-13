import { Injectable, NotFoundException } from '@nestjs/common';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { InjectModel } from 'nestjs-typegoose';
import { MovieService } from 'src/movie/movie.service';
import { CreateGenreDto } from './dto/create-genre.dto';
import { Collection } from './genre.interface';
import { GenreModel } from './genre.model';

@Injectable()
export class GenreService {
  constructor(
    @InjectModel(GenreModel) private readonly GenreModel: ModelType<GenreModel>,
    private readonly MovieService: MovieService,
  ) {}

  async bySlug(slug: string) {
    const doc = await this.GenreModel.findOne({ slug }).exec();

    if (!doc) throw new NotFoundException('Genre not found');

    return doc;
  }

  async getAll(searchTerm?: string) {
    let options = {};

    if (searchTerm)
      options = {
        $or: [
          {
            name: new RegExp(searchTerm, 'i'),
          },
          {
            slug: new RegExp(searchTerm, 'i'),
          },
          {
            description: new RegExp(searchTerm, 'i'),
          },
        ],
      };

    return this.GenreModel.find(options)
      .select('-updatedAt, -__v')
      .sort({ createdAt: 'desc' })
      .exec();
  }

  async getCollections() {
    const genres = await this.getAll();

    const collections = await Promise.all(
      genres.map(async (genre) => {
        const movieByGenre = await this.MovieService.byGenres([genre._id]);

        const result: Collection = {
          _id: String(genre._id),
          image: movieByGenre[0].bigPoster,
          slug: genre.slug,
          title: genre.name,
        };

        return result;
      }),
    );

    return collections;
  }

  /**Admin place */
  async byId(_id: string) {
    const genre = await this.GenreModel.findById(_id);

    if (!genre) throw new NotFoundException('Genre not found');

    return genre;
  }

  async create() {
    const defaultValue: CreateGenreDto = {
      name: '',
      slug: '',
      description: '',
      icon: '',
    };

    const genre = await this.GenreModel.create(defaultValue);

    return genre._id;
  }

  async update(_id: string, dto: CreateGenreDto) {
    const updateDoc = await this.GenreModel.findByIdAndUpdate(_id, dto, {
      new: true,
    }).exec();

    if (!updateDoc) throw new NotFoundException('Genre not Found');

    return updateDoc;
  }

  async delete(_id: string) {
    const deleteDoc = await this.GenreModel.findByIdAndDelete(_id).exec();

    if (!deleteDoc) throw new NotFoundException('Genre not Found');

    return deleteDoc;
  }
}
