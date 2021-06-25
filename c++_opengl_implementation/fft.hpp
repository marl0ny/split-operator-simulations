#include <cmath>


#ifndef _FFT_
#define _FFT_


static const double tau = 6.2831853071795864;
static const double invsqrt2 = 0.70710678118654752;



template <typename T>
static void bitreverse2(T *arr, int n) {
    int u, d, rev;
    for (int i = 0; i < n; i++) {
        u = 1;
        d = n >> 1;
        rev = 0;
        while (u < n) {
            rev += d*((i&u)/u);
            u <<= 1;
            d >>= 1;
        }
        if (rev >= i) {
            T tmp = arr[i];
            arr[i] = arr[rev];
            arr[rev] = tmp;
        }
    }
}

#define _USE_COS_ARR
#ifdef _USE_COS_ARR
static double _cos_arr[256];
static bool _is_cos_arr_init = false;
static void _cos_arr_init(int n) {
    double angle=tau/n;
    double c, s;
    _cos_arr[0] = 1.0;
    _cos_arr[n/8] = invsqrt2;
    _cos_arr[n/4] = 0.0;
    _cos_arr[3*n/8] = -invsqrt2;
    for (int i = 1; i < n/8; i++) {
        c = cos(i*angle);
        s = sin(i*angle);
        _cos_arr[i] = c;
        _cos_arr[n/4 - i] = s;
        _cos_arr[n/4 + i] = -s;
        _cos_arr[n/2 - i] = -c;
    }
}
#endif


template <typename T>
static inline void _fft(bool is_inverse, T* z, int n) {
    bitreverse2(z, n);
    #ifdef _USE_COS_ARR
    if (! _is_cos_arr_init) {
        _cos_arr_init(n);
         _is_cos_arr_init = true;
    }
    #endif
    T even, odd;
    T exp;
    double cos_val, sin_val;
    int block_total;
    double sign = (is_inverse)? -1.0: 1.0;
    for (int block_size = 2; block_size <= n; block_size *= 2) {
        block_total = n/block_size;
        for (int j = 0; j < n; j += block_size) {
            for (int i = 0; i < block_size/2; i++) {
                #ifdef _USE_COS_ARR
                cos_val = _cos_arr[i*block_total];
                sin_val = (i*block_total < n/4)?
                         (-sign*_cos_arr[i*block_total + n/4]):
                         (sign*_cos_arr[i*block_total - n/4]);
                #else
                cos_val = cos(tau*i/block_size);
                sin_val = sign*sin(tau*i/block_size);
                #endif
                /*Get even and odd elements*/
                even = z[j + i];
                odd = z[block_size/2 + j + i];
                exp.real(cos_val*odd.real() - odd.imag()*sin_val);
                exp.imag(cos_val*odd.imag() + odd.real()*sin_val);
                /* Butterfly */
                double n_val = 1.0;
                if (is_inverse && block_size == n) n_val = n;
                z[j + i].real((even.real() + exp.real())/n_val);
                z[j + i].imag((even.imag() + exp.imag())/n_val);
                z[block_size/2 + j + i].real((even.real() 
                                               - exp.real())/n_val);
                z[block_size/2 + j + i].imag((even.imag()
                                               - exp.imag())/n_val);
            }
        }
    }
}


/* Iterative in Place Radix-2
Cooley-Turkey Fast Fourier Transform Algorithm.
Please note that the input array size must be a
a power of two - there are zero checks on this.

References:

Wikipedia - Cooley–Tukey FFT algorithm:
https://en.wikipedia.org/wiki/Cooley%E2%80%93Tukey_FFT_algorithm

Press W. et al. (1992). Fast Fourier Transform.
In Numerical Recipes in Fortran 77, chapter 12
https://websites.pmc.ucsc.edu/~fnimmo/eart290c_17/NumericalRecipesinF77.pdf

MathWorld Wolfram - Fast Fourier Transform:
http://mathworld.wolfram.com/FastFourierTransform.html 
*/
template <typename T>
void inplace_fft(T *z, int n) {
    _fft<T>(false, z, n);
}


template <typename T>
void inplace_ifft(T *z, int n) {
    _fft<T>(true, z, n);
}


template <typename T>
static void square_transpose(T *arr, int n) {
    # pragma omp parallel for
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            T tmp = arr[n*i + j];
            arr[n*i + j] = arr[n*j + i];
            arr[n*j + i] = tmp;
        }
    }
}

template <typename T>
static void transpose(T *dest, T *src, int w, int h) {
    # pragma omp parallel for
    for (int i = 0; i < h; i++) {
        for (int j = 0; j < w; j++) {
            dest[j*h + i] = src[i*w + j];
        }
    }
}

template <typename T>
static T *alloc_square_transpose(T *arr, int n) {
    T *arr_cpy = new T[n*n];
    #pragma omp parallel for
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            arr_cpy[j][i] = arr[i][j];
        }
    }
    return arr_cpy;
}

template <typename T>
static void square_bitreverse2(T *arr, int n) {
    for (int i = 0; i < n; i++) {
        bitreverse2<T>(&arr[i*n], n);
    }
    square_transpose<T>(arr, n);
    for (int i = 0; i < n; i++) {
        bitreverse2<T>(&arr[i*n], n);
    }
    square_transpose<T>(arr, n);
    
}

template <typename T>
void inplace_fft2(T *z, int w) {
    # pragma omp parallel for
    for (int i = 0; i < w; i++) {
        inplace_fft<T>(&z[i*w], w);
    }
    square_transpose<T>(z, w);
    # pragma omp parallel for
    for (int i = 0; i < w; i++) {
        inplace_fft<T>(&z[i*w], w);
    }
    square_transpose<T>(z, w);
}

template <typename T>
void inplace_fft2(T *z, int w, int h) {
    #pragma omp parallel for
    for (int i = 0; i < h; i++) {
        inplace_fft<T>(&z[i*h], w);
    }
    T *transpose_arr = new T[w*h];
    transpose<T>(transpose_arr, z, w, h);
    #pragma omp parallel for
    for (int i = 0; i < w; i++) {
        inplace_fft<T>(&transpose_arr[i*w], h);
    }
    transpose<T>(z, transpose_arr, h, w);
    delete[] transpose_arr;
}

template <typename T>
void inplace_ifft2(T *z, int w) {
    # pragma omp parallel for
    for (int i = 0; i < w; i++) {
        inplace_ifft<T>(&z[i*w], w);
    }
    square_transpose<T>(z, w);
    # pragma omp parallel for
    for (int i = 0; i < w; i++) {
        inplace_ifft<T>(&z[i*w], w);
    }
    square_transpose<T>(z, w);
}

template <typename T>
void inplace_ifft2(T *z, int w, int h) {
    #pragma omp parallel for
    for (int i = 0; i < h; i++) {
        inplace_ifft<T>(&z[i*h], w);
    }
    T *transpose_arr = new T[w*h];
    transpose<T>(transpose_arr, z, w, h);
    #pragma omp parallel for
    for (int i = 0; i < w; i++) {
        inplace_ifft<T>(&transpose_arr[i*w], h);
    }
    transpose<T>(z, transpose_arr, h, w);
    delete[] transpose_arr;
}

template <typename T>
void inplace_fftshift(T *z, int n) {
    for (int i = 0; i < n/2; i++) {
        T tmp = z[i + n/2];
        z[i + n/2] = z[i];
        z[i] = tmp;
    }
}

template <typename T>
void inplace_fftshift2(T *z, int w) {
    # pragma omp parallel for
    for (int i = 0; i < w; i++) {
        inplace_fftshift<T>(&z[i*w], w);
    }
    square_transpose<T>(z, w);
    # pragma omp parallel for
    for (int i = 0; i < w; i++) {
        inplace_fftshift<T>(&z[i*w], w);
    }
    square_transpose<T>(z, w);
}

template <typename T>
void inplace_fftshift2(T *z, int w, int h) {
    #pragma omp parallel for
    for (int i = 0; i < h; i++) {
        inplace_fftshift<T>(&z[i*h], w);
    }
    T *transpose_arr = new T[w*h];
    transpose(transpose_arr, z, w, h);
    #pragma omp parallel for
    for (int i = 0; i < w; i++) {
        inplace_fftshift<T>(&z[i*w], h);
    }
    transpose(z, transpose_arr, w, h);
    delete[] transpose_arr;
}

void fftfreq(double *arr, int n) {
    if (n % 2 == 0) {
        for (int i = 0; i <= n/2 - 1; i++) {
            arr[i] = i;
        }
        for (int i = n-1, j = -1; i >= n/2; i--, j--) {
            arr[i] = j;
        }
    } else {
        int k = 0;
        for (int i = 0; i <= (n-1)/2; i++) {
            arr[i] = k;
            k += 1;
        }
        k =  -k;
        for (int i = (n-1)/2 + 1; i < n; i++) {
            arr[i] = k;
            k -= 1;
        }
    }
}



void fftfreq2(double *horizontal, double *vertical,
              int w, int h) {
    for (int i = 0; i < h; i++) {
        fftfreq(&horizontal[h*i], w);
    }
    double *transpose_arr = new double[w*h];
    transpose<double>(transpose_arr, vertical, w, h);
    for (int i = 0; i < w; i++) {
        fftfreq(&transpose_arr[w*i], h);
    }
    transpose<double>(vertical, transpose_arr, h, w);
    delete[] transpose_arr;
}

#endif
