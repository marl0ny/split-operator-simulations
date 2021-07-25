from .. import SplitStepMethod
import numpy as np
from typing import Tuple, Union, List, Dict, Callable
np.seterr(all='raise')


class KleinGordonSplitstep(SplitStepMethod):
    r"""
    The Klein-Gordon Split-Step Method.

    The Klein Gordon equations in momentum space is:
    -\frac{\hbar^2}{c^2} \ddot{\phi} = p^2 \phi + m^2 c^2 \phi
    Using the following definitions
    \phi_1 = \phi,
    \phi_2 = \dot{\phi_1},
    \dot{\phi_2} = -\frac{c^2}{hbar^2}(p^2 \phi_1 + m^2 c^2 \phi_1),
    we can then apply the Split-Step method on (\phi_1, \phi_2).

    References:

    https://en.wikipedia.org/wiki/Klein%E2%80%93Gordon_equation

    Hartree Units:

    https://en.wikipedia.org/wiki/Hartree_atomic_units

    """

    def __init__(self, potential: np.ndarray,
                 dimensions: Tuple[float, ...],
                 timestep: Union[float, np.complex128] = 1.0,
                 m: float = 1.0,
                 units: Dict[str, float] = None,
                 shape: Tuple[int, ...] = None) -> None:
        self._m = m
        self._exp_p = None
        self._exp_V = None
        self._V = potential
        self._nonlinear = None
        self._dimensions = dimensions
        self._shape = (np.copy(potential.shape) 
                       if potential is not None else shape)
        self.C = units['c'] if units and 'c' in units.keys() else 137.036
        self.HBAR = (units['hbar'] if units and 'hbar' 
                     in units.keys() else 1.0)
        tmp = np.zeros(self._shape)
        SplitStepMethod.__init__(self, tmp, dimensions, timestep)

    def set_timestep(self, timestep: Union[float, np.complex128]) -> None:
        """
        Set the timestep. It can be real or complex.

        The matrix that corresponds to propagating the free-particle 
        wavefunction in time is derived using the following lines of code:

        >>> from sympy import Matrix, Symbol, exp
        >>> # -hbar^2(d^2/dt^2)phi = - c^2hbar^2laplacian(phi) + m^2c^4phi
        >>> # -(hbar/c)^2(d^2/dt^2)phi = p^2phi + m^2c^2phi
        >>> # (hbar/c)^2(d^2/dt^2)phi = -p^2phi - m^2c^2phi
        >>> # (d^2/dt^2)phi = -(c^2p^2/hbar^2)phi - 
        >>> #                  (m^2c^4/hbar^2)phi + V(x)phi
        >>> p2 = Symbol('p2', real=True)
        >>> c2_hbar2 = Symbol('c2_hbar2', positive=True)
        >>> m2c4_hbar2 = Symbol('m2c4_hbar2', positive=True)
        >>> dt = Symbol('dt')
        >>> ec = exp(dt*Matrix([[0, 0.5], 
        >>>                     [-p2*c2_hbar2 - m2c4_hbar2, 0]])).simplify()
        >>> for i, term in enumerate(ec):
        >>>     j, k = i // 2, i % 2
        >>>     print('e%d%d = ' % (j, k), term)
        >>> V = Symbol('V')
        >>> vc = exp(dt*Matrix([[0, 0.5], 
        >>>                     [V*c2_hbar2, 0]])).simplify()
        >>> for i, term in enumerate(vc):
        >>>     j, k = i // 2, i % 2
        >>>     print('e%d%d = ' % (j, k), term)

        """
        p_list = []
        for i, d in enumerate(self._shape):
            freq = np.pi*np.fft.fftfreq(d)
            freq[0] = 1e-17
            p_list.append(np.complex128(2.0)*freq*d/self._dim[i])
        p2 = sum([p_i**2 for p_i in np.meshgrid(*p_list)])
        self._dt = timestep
        dt = np.complex128(self._dt)
        c2_hbar2 = self.C**2/self.HBAR**2
        m2c4_hbar2 = self._m*self.C**4/self.HBAR**2
        omega = np.sqrt(c2_hbar2*p2 + m2c4_hbar2)
        f = 1.0
        if self._V is not None:
            f = 2.0
            omega = omega/np.sqrt(2.0)
        e00 =  np.cos(dt*omega)
        e01 =  np.sin(dt*omega)/(f*omega)
        e10 =  -f*omega*np.sin(dt*omega)
        e11 =  np.cos(dt*omega)
        self._exp_p = [[e00, e01], [e10, e11]]
        self.set_potential(self._V)

    def set_nonlinear_term(self, nonlinear: Callable) -> None:
        """
        Set the nonlinear term.
        """
        self._nonlinear = nonlinear

    def set_potential(self, potential: np.ndarray) -> None:
        self._V = potential
        if potential is None:
            return
        V = potential
        dt = np.complex128(self._dt)/2.0
        sqrt2 = np.complex128(np.sqrt(2.0))
        invsqrt2 = np.complex128(1.0/np.sqrt(2.0))
        c2_hbar2 = np.complex128(self.C**2/self.HBAR**2)
        try:
            e00 =  1.0*np.cos(invsqrt2*V**0.5*c2_hbar2**0.5*dt)
            e01 =  invsqrt2*V**(-0.5)*c2_hbar2**(-0.5)
            e01 *= np.sin(invsqrt2*V**0.5*c2_hbar2**0.5*dt)
            e10 =  -sqrt2*V**0.5*c2_hbar2**0.5
            e10 *= np.sin(invsqrt2*V**0.5*c2_hbar2**0.5*dt)
            e11 =  1.0*np.cos(invsqrt2*V**0.5*c2_hbar2**0.5*dt)
            self._exp_V = [[e00, e01], [e10, e11]]
        except FloatingPointError as e:
            print(np.max(invsqrt2*V**0.5*c2_hbar2**0.5*dt))
            print(np.min(invsqrt2*V**0.5*c2_hbar2**0.5*dt))
            print(e)

    def _exp_potential_wavefunc(self, 
                                psi: List[np.ndarray]) -> List[np.ndarray]:
        if self._V is not None:
            if self._nonlinear is not None:
                self.set_potential(self._V + self._nonlinear(psi[0]))
            exp_V = self._exp_V
            psi = [exp_V[0][0]*psi[0] + exp_V[0][1]*psi[1], 
                    exp_V[1][0]*psi[0] + exp_V[1][1]*psi[1]]
        return psi

    def __call__(self, psi: List[np.ndarray]) -> List[np.ndarray]:
        """
        Step the wavefunction in time.
        """
        psi = self._exp_potential_wavefunc(psi)
        psi_p = [np.fft.fftn(psi[i]) for i in range(2)]
        exp_p = self._exp_p
        psi_p = [exp_p[0][0]*psi_p[0] + exp_p[0][1]*psi_p[1], 
                 exp_p[1][0]*psi_p[0] + exp_p[1][1]*psi_p[1]]
        psi = [np.fft.ifftn(psi_p[i]) for i in range(2)]
        psi = self._exp_potential_wavefunc(psi)
        return psi
