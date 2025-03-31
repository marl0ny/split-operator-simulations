#ifndef __MATRIX_ 
#define __MATRIX_  

#include <vector>

typedef double ftype;

class Matrix {
    std::vector<ftype> data;
    size_t width, height;
    std::vector<ftype *> get_row_pointers();
    std::vector<const ftype *> get_const_row_pointers() const;
    public:
    Matrix(int width, int height);
    Matrix(const std::vector<ftype> &data, int width, int height);
    Matrix(const std::vector<std::vector<ftype>> &data);
    std::vector<ftype> solve(const std::vector<ftype> &b) const;
    Matrix inverse() const;
    ftype &operator()(size_t i, size_t j);
    ftype operator()(size_t i, size_t j) const;
    ftype determinant() const;
    void print();
    static Matrix identity(int size);
    Matrix operator*(const Matrix &m) const;
    static void test_det();
    static void test_solve();
    static void test_inverse();
};

#endif